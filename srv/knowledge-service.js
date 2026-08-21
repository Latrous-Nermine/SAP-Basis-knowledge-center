import cds from '@sap/cds';
import { canTransition, isContributor } from './domain/KnowledgeWorkflow.js';
import { makeSearchCaseInsensitive } from './domain/CaseInsensitiveSearch.js';
import { isValidVoteValue, countFieldFor } from './domain/knowledge/VotingRules.js';
import { isAllowedType, isAllowedSize, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from './domain/knowledge/AttachmentValidation.js';
import { orderByFor } from './domain/knowledge/KnowledgeRanking.js';
import { notify, notifyMany } from './lib/notify.js';
import { awardReputation } from './lib/reputation.js';
import { frenchResultWord } from './lib/notifications/notification-rules.js';
import { NoOpSecurityGuardian, decisionForRiskScore } from './domain/knowledge/SecurityGuardian.js';

const securityGuardian = new NoOpSecurityGuardian();

/** Reputation awarded per approved Knowledge Center item/contribution -
    modest, real values in the same order of magnitude as the Questions
    module's own awards (+15 accepted answer, +10 answer bonus), NOT
    the inflated illustrative numbers in the seed CSV. A full new
    article is worth more than an addition to an existing one. */
const REPUTATION_ITEM_APPROVED = 20;
const REPUTATION_CONTRIBUTION_APPROVED = 8;

/**
 * Handler for KnowledgeService. Stays thin: reads req, delegates the
 * state-machine rule to KnowledgeWorkflow.js, runs one transaction, returns.
 */
export default class KnowledgeService extends cds.ApplicationService {

  async init() {
    const {
      KnowledgeItems, KnowledgeContributors, KnowledgeRelations,
      KnowledgeVotes, KnowledgeContributions, UserProfiles,
    } = cds.entities('aymax.knowledgehub');
    const { Comments } = cds.entities('aymax.knowledgehub');

    // ────────────────────────────────────────────────────────────
    // A freshly created item has no KnowledgeContributors row yet, and
    // the READ @restrict only allows approved items or ones the caller
    // contributes to - without this, a new item would be invisible to
    // its own author the moment it's created.
    // ────────────────────────────────────────────────────────────
    this.before('CREATE', 'KnowledgeItems', async (req) => {
      req.data.contributors = [
        { user_userID: req.user.id, role: 'author' },
      ];
    });

    // ────────────────────────────────────────────────────────────
    // Attachment upload - MIME type + size are validated here, the one
    // authoritative place (AttachmentValidation.js), never left to the
    // frontend's own pre-upload check alone. A role alone doesn't prove
    // the caller owns THIS item, so the contributor check mirrors
    // submitForReview's isContributor pattern below rather than trusting
    // the CREATE restrict's role grant to be the whole story.
    // ────────────────────────────────────────────────────────────
    this.before('CREATE', 'KnowledgeAttachments', async (req) => {
      const { fileType, fileSize, item_ID } = req.data;

      if (!isAllowedType(fileType)) {
        return req.reject(400, `File type '${fileType}' is not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
      }
      if (!isAllowedSize(fileSize)) {
        return req.reject(400, `File size must be between 1 byte and ${MAX_FILE_SIZE_BYTES} bytes`);
      }
      if (!item_ID) return req.reject(400, 'item_ID is required');

      const contributors = await SELECT.from(KnowledgeContributors).where({ item_ID });
      if (!isContributor(contributors, req.user.id)) {
        return req.reject(403, 'Only a contributor can attach files to this item');
      }
    });

    // Title search (KnowledgeList.controller.js) - case-insensitive, see
    // CaseInsensitiveSearch.js for why this is a backend query rewrite.
    this.before('READ', 'KnowledgeItems', (req) => {
      makeSearchCaseInsensitive(req.query);
    });

    // Ranking (?sort=relevant|upvoted|recent, default relevant) - a plain
    // custom query parameter, not $orderby: the frontend only ever names
    // an intent, it never sees or constructs the actual column list, so
    // "what relevant/upvoted/recent MEAN" stays a backend decision
    // (KnowledgeRanking.js), not something the UI controller decides.
    // This runs before the query executes, so WHERE (restrict + any
    // $filter) and ORDER BY are compiled into the same single SQL
    // statement - ranking can never happen before authorization/scope
    // filtering, because there is only ever one query, not two.
    this.before('READ', 'KnowledgeItems', (req) => {
      const sortKey = req.http?.req?.query?.sort;
      req.query.SELECT.orderBy = orderByFor(sortKey);
    });

    // myVote (caller-specific) + contributors[].displayName (not
    // caller-specific - everyone who can see the contributors array sees
    // the same names) - one batched query each per page load, same
    // pattern as PeopleService's isFollowedByMe. Deliberately done here
    // rather than a separate after-READ on KnowledgeContributors: this
    // hook is already proven to fire correctly for expanded data (see
    // myVote below), where a sub-entity's own after-READ firing under
    // $expand was NOT something I could assume after the votes/@restrict
    // surprise - safer to build on what's already confirmed working.
    this.after('READ', 'KnowledgeItems', async (data, req) => {
      const rows = (Array.isArray(data) ? data : [data]).filter(Boolean);
      if (!rows.length) return;

      if (req.user?.id) {
        const itemIDs = rows.map((r) => r.ID);
        const myVotes = await SELECT.from(KnowledgeVotes).columns('item_ID', 'value')
          .where({ user_userID: req.user.id, item_ID: { in: itemIDs } });

        const votesByItem = new Map(myVotes.map((v) => [v.item_ID, v.value]));
        for (const row of rows) {
          row.myVote = votesByItem.has(row.ID) ? votesByItem.get(row.ID) : null;
        }
      }

      const contributorUserIDs = new Set();
      for (const row of rows) {
        for (const c of row.contributors || []) contributorUserIDs.add(c.user_userID);
      }
      if (contributorUserIDs.size) {
        const people = await SELECT.from(UserProfiles).columns('userID', 'displayName')
          .where({ userID: { in: [...contributorUserIDs] } });
        const nameByID = new Map(people.map((p) => [p.userID, p.displayName]));
        for (const row of rows) {
          for (const c of row.contributors || []) {
            c.displayName = nameByID.get(c.user_userID) || c.user_userID;
          }
        }
      }
    });

    // ────────────────────────────────────────────────────────────
    // Category tab counts - filtered EXACTLY like the list itself.
    // Computed after row-level filtering, never before (CLAUDE.md §7.6):
    // otherwise the tab count leaks the existence of items the caller
    // cannot see.
    // ────────────────────────────────────────────────────────────
    this.on('getCategoryCounts', async (req) => {
      const rows = await SELECT.from(KnowledgeItems)
        .columns('category')
        .where`status = ${'approved'} or exists contributors[user_userID = ${req.user.id}]`;

      const counts = new Map();
      for (const { category } of rows) {
        counts.set(category, (counts.get(category) || 0) + 1);
      }
      return [...counts.entries()].map(([category, count]) => ({ category, count }));
    });

    // ────────────────────────────────────────────────────────────
    // Sidebar "Documents liés"
    // ────────────────────────────────────────────────────────────
    this.on('getRelated', async (req) => {
      const { itemID } = req.data;
      const relations = await SELECT.from(KnowledgeRelations)
        .columns('relatedItem_ID')
        .where({ item_ID: itemID });
      if (!relations.length) return [];

      const ids = relations.map((r) => r.relatedItem_ID);
      return SELECT.from(KnowledgeItems).columns('ID', 'title').where({ ID: { in: ids } });
    });

    // ────────────────────────────────────────────────────────────
    // draft/rejected -> pending
    // ────────────────────────────────────────────────────────────
    this.on('submitForReview', async (req) => {
      const { itemID } = req.data;

      const item = await SELECT.one.from(KnowledgeItems).where({ ID: itemID });
      if (!item) return req.reject(404, 'Knowledge item not found');

      const contributors = await SELECT.from(KnowledgeContributors).where({ item_ID: itemID });
      if (!isContributor(contributors, req.user.id)) {
        return req.reject(403, 'Only a contributor can submit this item for review');
      }
      if (!canTransition(item.status, 'pending')) {
        return req.reject(409, `Cannot submit an item from status '${item.status}'`);
      }

      // AI Security Guardian seam (CLAUDE.md §5 C6, decided but never
      // wired up until now). NoOpSecurityGuardian always returns risk
      // 0 today, so every existing submission still resolves to
      // 'publish' below and behaves exactly as before - what's new is
      // that the decision rule itself (spec §7.7: 0-39 publish, 40-69
      // warn, 70-100 block) is real and runs on every call, ready for
      // a real assessor to be swapped in without touching this handler.
      const { riskScore } = await securityGuardian.assess(`${item.title}\n${item.content ?? ''}`);
      const decision = decisionForRiskScore(riskScore);
      if (decision === 'block') {
        return req.reject(403, 'Ce contenu a été bloqué par la revue de sécurité automatisée et ne peut pas être soumis.');
      }

      await UPDATE(KnowledgeItems).set({ status: 'pending' }).where({ ID: itemID });

      if (decision === 'warn') {
        const admins = await SELECT.from(UserProfiles).columns('userID').where({ role: 'Administrator' });
        notifyMany(
          admins.map((a) => a.userID),
          'SECURITY_EVENT',
          { sourceType: 'KNOWLEDGE', sourceId: itemID, params: { detail: `Contenu à risque modéré soumis pour revue : ${item.title}` } },
        );
      }

      // Every Manager can see/act on any pending item (this service's
      // own READ restrict above has no department scoping for pending
      // items), so every Manager is a valid recipient - not just the
      // author's own department. Self-skip: a Manager submitting their
      // own item shouldn't be told to go review it.
      const managers = await SELECT.from(UserProfiles).columns('userID').where({ role: 'Manager' });
      notifyMany(
        managers.map((m) => m.userID).filter((id) => id !== req.user.id),
        'VALIDATION_REQUESTED',
        { sourceType: 'KNOWLEDGE', sourceId: itemID, params: { title: item.title } },
      );
      return true;
    });

    // ────────────────────────────────────────────────────────────
    // pending -> approved / rejected
    // ────────────────────────────────────────────────────────────
    const decide = (toStatus) => async (req) => {
      const { itemID } = req.data;
      const item = await SELECT.one.from(KnowledgeItems).where({ ID: itemID });
      if (!item) return req.reject(404, 'Knowledge item not found');
      if (!canTransition(item.status, toStatus)) {
        return req.reject(409, `Cannot move an item from '${item.status}' to '${toStatus}'`);
      }

      const patch = { status: toStatus };
      if (toStatus === 'approved') patch.publishedAt = new Date();
      await UPDATE(KnowledgeItems).set(patch).where({ ID: itemID });

      // Reputation only on approval, never on rejection - and only to
      // the item's actual author(s), not every contributor (a
      // contributor's own reputation is awarded separately, when THEIR
      // contribution is approved - see decideContribution below).
      const authors = await SELECT.from(KnowledgeContributors)
        .columns('user_userID').where({ item_ID: itemID, role: 'author' });
      const recipients = authors.map((a) => a.user_userID).filter((id) => id !== req.user.id);

      if (toStatus === 'approved') {
        for (const authorID of recipients) {
          await awardReputation(authorID, REPUTATION_ITEM_APPROVED, `Publication approuvée : ${item.title}`, 'publication', {
            sourceType: 'KnowledgeItem', sourceID: itemID,
          });
        }
      }

      notifyMany(recipients, 'VALIDATION_RESULT', {
        sourceType: 'KNOWLEDGE', sourceId: itemID,
        params: { title: item.title, result: frenchResultWord(toStatus) },
      });

      return true;
    };
    this.on('approveItem', decide('approved'));
    this.on('rejectItem', decide('rejected'));

    // ────────────────────────────────────────────────────────────
    // Comment thread (Contract B - extends Lot 1's Comments)
    // ────────────────────────────────────────────────────────────
    this.on('addComment', async (req) => {
      const { itemID, content } = req.data;
      if (!content?.trim()) return req.reject(400, 'content is required');

      const item = await SELECT.one.from(KnowledgeItems).where({ ID: itemID });
      if (!item) return req.reject(404, 'Knowledge item not found');

      const ID = cds.utils.uuid();
      await INSERT.into(Comments).entries({
        ID,
        knowledgeItem_ID: itemID,
        author_userID: req.user.id,
        content: content.trim(),
      });
      return ID;
    });

    // ────────────────────────────────────────────────────────────
    // Voting - upvoteCount/downvoteCount/netScore are denormalised
    // counters (db/lot2.cds), kept in sync here, in the same request,
    // never independently. voteItem is an upsert: calling it again with
    // the SAME value it already has is a safe no-op, not an error -
    // toggling a vote OFF is removeVote, a deliberately separate action
    // the frontend chooses to call once it already knows the caller's
    // current vote (via the `votes` expand, which only ever returns the
    // caller's own row - see the entity's own @restrict).
    // ────────────────────────────────────────────────────────────
    this.on('voteItem', async (req) => {
      const { itemID, value } = req.data;
      if (!isValidVoteValue(value)) return req.reject(400, 'value must be +1 or -1');

      const item = await SELECT.one.from(KnowledgeItems).where({ ID: itemID });
      if (!item) return req.reject(404, 'Knowledge item not found');
      // Enforced here, not just hidden client-side (spec requirement) -
      // a direct API call against a non-approved item must be rejected.
      if (item.status !== 'approved') return req.reject(403, 'Voting is only allowed on approved items');

      const existing = await SELECT.one.from(KnowledgeVotes).where({ item_ID: itemID, user_userID: req.user.id });

      if (existing && existing.value === value) return true;

      if (existing) {
        await UPDATE(KnowledgeVotes, existing.ID).with({ value });
        await UPDATE(KnowledgeItems, itemID).with({
          [countFieldFor(existing.value)]: { '-=': 1 },
          [countFieldFor(value)]: { '+=': 1 },
          // Switching direction moves netScore by 2 (e.g. -1 -> +1 is +2).
          netScore: { [value === 1 ? '+=' : '-=']: 2 },
        });
      } else {
        await INSERT.into(KnowledgeVotes).entries({
          ID: cds.utils.uuid(), item_ID: itemID, user_userID: req.user.id, value,
        });
        await UPDATE(KnowledgeItems, itemID).with({
          [countFieldFor(value)]: { '+=': 1 },
          netScore: { [value === 1 ? '+=' : '-=']: 1 },
        });
      }
      return true;
    });

    // No-op (not an error) if the caller had no active vote - matches
    // "clicking again removes the vote" being idempotent either way.
    this.on('removeVote', async (req) => {
      const { itemID } = req.data;
      const existing = await SELECT.one.from(KnowledgeVotes).where({ item_ID: itemID, user_userID: req.user.id });
      if (!existing) return true;

      await DELETE.from(KnowledgeVotes).where({ ID: existing.ID });
      await UPDATE(KnowledgeItems, itemID).with({
        [countFieldFor(existing.value)]: { '-=': 1 },
        netScore: { [existing.value === 1 ? '-=' : '+=']: 1 },
      });
      return true;
    });

    // ────────────────────────────────────────────────────────────
    // Contributions - propose an addition to an ALREADY APPROVED item.
    // Distinct from creating a brand-new KnowledgeItems row, which is
    // unchanged. Approving one never touches KnowledgeItems.content
    // (confirmed requirement) - only the contributor list and the
    // contribution's own status change.
    // ────────────────────────────────────────────────────────────
    this.on('submitContribution', async (req) => {
      const { itemID, content } = req.data;
      if (!content?.trim()) return req.reject(400, 'content is required');

      const item = await SELECT.one.from(KnowledgeItems).where({ ID: itemID });
      if (!item) return req.reject(404, 'Knowledge item not found');
      if (item.status !== 'approved') {
        return req.reject(409, 'Contributions can only be proposed for approved items');
      }

      const ID = cds.utils.uuid();
      await INSERT.into(KnowledgeContributions).entries({
        ID, item_ID: itemID, content: content.trim(), status: 'pending', submittedBy_userID: req.user.id,
      });
      return ID;
    });

    const decideContribution = (toStatus) => async (req) => {
      const { contributionID } = req.data;
      const contribution = await SELECT.one.from(KnowledgeContributions).where({ ID: contributionID });
      if (!contribution) return req.reject(404, 'Contribution not found');
      if (contribution.status !== 'pending') {
        return req.reject(409, `Cannot decide a contribution that is already '${contribution.status}'`);
      }
      const item = await SELECT.one.from(KnowledgeItems).columns('title').where({ ID: contribution.item_ID });

      await UPDATE(KnowledgeContributions, contributionID).with({
        status: toStatus, decidedAt: new Date(), decidedBy_userID: req.user.id,
      });

      if (toStatus === 'approved') {
        // Append, never replace - and never a duplicate if this user is
        // already a contributor on this item some other way.
        const alreadyContributor = await SELECT.one.from(KnowledgeContributors)
          .where({ item_ID: contribution.item_ID, user_userID: contribution.submittedBy_userID });
        if (!alreadyContributor) {
          await INSERT.into(KnowledgeContributors).entries({
            ID: cds.utils.uuid(),
            item_ID: contribution.item_ID,
            user_userID: contribution.submittedBy_userID,
            role: 'contributor',
          });
        }

        if (contribution.submittedBy_userID !== req.user.id) {
          await awardReputation(
            contribution.submittedBy_userID, REPUTATION_CONTRIBUTION_APPROVED,
            `Contribution acceptée : ${item?.title ?? ''}`, 'contribution',
            { sourceType: 'KnowledgeItem', sourceID: contribution.item_ID },
          );
        }
      }

      // Contract A, via srv/lib/notify.js (see that file for why this is
      // a detached, privileged transaction rather than a plain
      // cds.connect.to()+.send()).
      if (contribution.submittedBy_userID !== req.user.id) {
        notify(contribution.submittedBy_userID, 'VALIDATION_RESULT', {
          sourceType: 'KNOWLEDGE', sourceId: contribution.item_ID,
          params: { title: item?.title ?? '', result: frenchResultWord(toStatus) },
        });
      }

      return true;
    };
    this.on('approveContribution', decideContribution('approved'));
    this.on('rejectContribution', decideContribution('rejected'));

    // ────────────────────────────────────────────────────────────
    // Solved question -> Knowledge item (TODO-INTEGRATION.md I-07,
    // implemented 2026-08 now that Lot 3's Questions module has shipped).
    // Questions/Answers live in the same shared namespace
    // (aymax.knowledgehub) as everything else here, same cross-lot
    // read pattern already used for Comments above - not a new kind
    // of coupling, just reading Lot 3's data, never writing it.
    //
    // Only a resolved question WITH an accepted answer can be promoted:
    // publishing an open or merely-closed question would put an
    // unverified guess into the knowledge base under the same
    // authority as reviewed content. category/fromQuestion/
    // sourceQuestionID below are exactly the fields db/lot2.cds
    // already reserved for this, unused until now.
    //
    // status is set straight to 'approved', not 'draft'/'pending':
    // the action already requires the 'Manager' role (service
    // contract), and a Manager choosing to promote content IS the
    // approval act - routing it through submitForReview/approveItem
    // against themselves would be a no-op loop, not a real review.
    // ────────────────────────────────────────────────────────────
    this.on('promoteQuestion', async (req) => {
      const { questionID } = req.data;
      const { Questions, Answers } = cds.entities('aymax.knowledgehub');

      const question = await SELECT.one.from(Questions).where({ ID: questionID });
      if (!question) return req.reject(404, 'Question not found');
      if (question.status !== 'resolved' || !question.acceptedAnswer_ID) {
        return req.reject(409, 'Only a resolved question with an accepted answer can be promoted to Knowledge Center');
      }

      const alreadyPromoted = await SELECT.one.from(KnowledgeItems).where({ sourceQuestionID: questionID });
      if (alreadyPromoted) return req.reject(409, 'This question has already been promoted to Knowledge Center');

      const answer = await SELECT.one.from(Answers).where({ ID: question.acceptedAnswer_ID });

      const ID = cds.utils.uuid();
      await INSERT.into(KnowledgeItems).entries({
        ID,
        title: question.title,
        category: 'resolved_question',
        excerpt: question.content?.slice(0, 500),
        content: `${question.content}\n\n---\n\n**Réponse acceptée :**\n\n${answer?.content ?? ''}`,
        status: 'approved',
        publishedAt: new Date(),
        fromQuestion: true,
        sourceQuestionID: questionID,
      });

      const solverID = answer?.author_userID ?? question.author_userID;
      const contributorEntries = [
        { ID: cds.utils.uuid(), item_ID: ID, user_userID: solverID, role: 'author' },
      ];
      if (question.author_userID && question.author_userID !== solverID) {
        contributorEntries.push({ ID: cds.utils.uuid(), item_ID: ID, user_userID: question.author_userID, role: 'contributor' });
      }
      await INSERT.into(KnowledgeContributors).entries(contributorEntries);

      if (answer?.author_userID) {
        await awardReputation(
          answer.author_userID, REPUTATION_ITEM_APPROVED,
          `Réponse promue en article Knowledge Center : ${question.title}`, 'publication',
          { sourceType: 'KnowledgeItem', sourceID: ID },
        );
        // ARTICLE_PUBLISHED was defined in the notification schema but
        // never raised anywhere in the app before this - this is the
        // first real trigger for it, and a genuine semantic match
        // ("Nouvel article publié...") rather than reusing an
        // unrelated type.
        if (answer.author_userID !== req.user.id) {
          notify(answer.author_userID, 'ARTICLE_PUBLISHED', {
            sourceType: 'KNOWLEDGE', sourceId: ID,
            params: { title: question.title },
          });
        }
      }

      return ID;
    });

    return super.init();
  }
}
