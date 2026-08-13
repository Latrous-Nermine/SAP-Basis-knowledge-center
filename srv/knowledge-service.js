import cds from '@sap/cds';
import { canTransition, isContributor } from './domain/KnowledgeWorkflow.js';
import { makeSearchCaseInsensitive } from './domain/CaseInsensitiveSearch.js';
import { isValidVoteValue, countFieldFor } from './domain/knowledge/VotingRules.js';
import { isAllowedType, isAllowedSize, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from './domain/knowledge/AttachmentValidation.js';
import { orderByFor } from './domain/knowledge/KnowledgeRanking.js';

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

      await UPDATE(KnowledgeItems).set({ status: 'pending' }).where({ ID: itemID });
      // TODO-INTEGRATION.md I-12: notify() facade doesn't exist yet -
      // department managers should get VALIDATION_REQUESTED here.
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
      }

      // Contract A - the raw in-process action (the nicer srv/lib/notify.js
      // facade CLAUDE.md describes doesn't exist as a file yet, see
      // TODO-INTEGRATION.md I-12). Plain cds.connect.to()+.send() does NOT
      // run as 'internal-user' automatically - it propagates the ACTUAL
      // caller (a Manager here), which raise()'s own
      // @requires: ['internal-user','Administrator'] correctly rejects.
      // cds.spawn(..., cds.User.privileged) is CAP's documented mechanism
      // for exactly this: a detached transaction running as that elevated
      // identity - NOT cds.tx(), which nests inside the current request's
      // own already-open transaction and deadlocked SQLite's single
      // writer (found the hard way, verified against the server log).
      // Being detached also means a manager's already-committed approval
      // decision can never be undone by a notification hiccup; the
      // failure is still logged, never silently swallowed (CLAUDE.md §10).
      cds.spawn({ user: cds.User.privileged }, async (tx) => {
        const notificationService = await cds.connect.to('NotificationService');
        await notificationService.tx(tx).send('raise', {
          recipientID: contribution.submittedBy_userID,
          type: 'VALIDATION_RESULT',
          sourceType: 'KNOWLEDGE',
          sourceId: contribution.item_ID,
          params: JSON.stringify({ status: toStatus }),
        });
      }).on('failed', (err) => {
        console.error('Failed to notify contribution submitter', err);
      });

      return true;
    };
    this.on('approveContribution', decideContribution('approved'));
    this.on('rejectContribution', decideContribution('rejected'));

    // ────────────────────────────────────────────────────────────
    // Solved question -> Knowledge item (TODO-INTEGRATION.md I-07).
    // Lot 3's Questions entity doesn't exist yet - fail loudly rather
    // than silently doing nothing (CLAUDE.md §10).
    // ────────────────────────────────────────────────────────────
    this.on('promoteQuestion', async (req) => {
      return req.reject(501, 'promoteQuestion() is not available yet: it depends on Lot 3\'s '
        + 'Questions entity, which does not exist in this repo yet (TODO-INTEGRATION.md I-07).');
    });

    return super.init();
  }
}
