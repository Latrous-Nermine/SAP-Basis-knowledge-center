import cds from '@sap/cds';
import { calculateLevel } from './domain/ExpertiseLevelCalculator.js';

const MONTH_FORMATTER = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

function capitalize(sText) {
  return sText.charAt(0).toUpperCase() + sText.slice(1);
}

/**
 * Handler for PeopleService. Stays thin like KnowledgeService: reads req,
 * runs queries, returns. No srv/handlers/PeopleHandler.js - this codebase's
 * actual convention (Notifications, Knowledge Center) keeps handler logic
 * directly in the service .js file, not a separate handlers/ file.
 */
export default class PeopleService extends cds.ApplicationService {

  async init() {
    const { People } = this.entities;
    const {
      Follows, KnowledgeItems, KnowledgeContributors, KnowledgeAttachments,
      Comments, ReputationEvents,
    } = cds.entities('aymax.knowledgehub');

    // ────────────────────────────────────────────────────────────
    // Follower/following counts + "does the caller follow this person" +
    // server-computed expertise level - one batched query per page load,
    // same pattern as FeedHandler._enrichPosts (never N+1).
    // ────────────────────────────────────────────────────────────
    this.after('READ', 'People', async (data, req) => {
      const rows = (Array.isArray(data) ? data : [data]).filter(Boolean);
      if (!rows.length) return;

      const userIDs = rows.map((r) => r.userID);

      const [followerRows, followingRows] = await Promise.all([
        SELECT.from(Follows).columns('followedUser_userID')
          .where({ followedUser_userID: { in: userIDs } }),
        SELECT.from(Follows).columns('userID')
          .where({ userID: { in: userIDs }, followedUser_userID: { '!=': null } }),
      ]);

      const followerCounts = new Map();
      for (const { followedUser_userID } of followerRows) {
        followerCounts.set(followedUser_userID, (followerCounts.get(followedUser_userID) || 0) + 1);
      }
      const followingCounts = new Map();
      for (const { userID } of followingRows) {
        followingCounts.set(userID, (followingCounts.get(userID) || 0) + 1);
      }

      let myFollows = new Set();
      if (req.user?.id) {
        const mine = await SELECT.from(Follows).columns('followedUser_userID')
          .where({ userID: req.user.id, followedUser_userID: { in: userIDs } });
        myFollows = new Set(mine.map((f) => f.followedUser_userID));
      }

      for (const row of rows) {
        row.followersCount = followerCounts.get(row.userID) || 0;
        row.followingCount = followingCounts.get(row.userID) || 0;
        row.isFollowedByMe = myFollows.has(row.userID);
        row.expertiseLevel = calculateLevel(row.reputation);
      }
    });

    // ────────────────────────────────────────────────────────────
    // Follow / unfollow - writes Follows (Lot 1's entity), never
    // UserProfiles. Idempotent: following twice, or unfollowing someone
    // you don't follow, is a no-op rather than an error.
    // ────────────────────────────────────────────────────────────
    this.on('followUser', async (req) => {
      const { userID } = req.data;
      if (userID === req.user.id) return req.reject(400, 'Cannot follow yourself');

      const target = await SELECT.one.from(People).where({ userID });
      if (!target) return req.reject(404, 'User not found');

      const existing = await SELECT.one.from(Follows)
        .where({ userID: req.user.id, followedUser_userID: userID });
      if (!existing) {
        await INSERT.into(Follows).entries({
          ID: cds.utils.uuid(),
          userID: req.user.id,
          followedUser_userID: userID,
        });
      }
      return true;
    });

    this.on('unfollowUser', async (req) => {
      const { userID } = req.data;
      await DELETE.from(Follows).where({ userID: req.user.id, followedUser_userID: userID });
      return true;
    });

    // ────────────────────────────────────────────────────────────
    // Activity: assembled from entities that already exist, not a
    // duplicate ledger. "Answered question" is missing on purpose -
    // Lot 3's Questions entity doesn't exist yet (TODO-INTEGRATION.md).
    // ────────────────────────────────────────────────────────────
    this.on('getActivity', async (req) => {
      const { userID } = req.data;
      const iLimit = req.data.limit || 10;

      const contributions = await SELECT.from(KnowledgeContributors)
        .columns('item_ID').where({ user_userID: userID });
      const itemIDs = contributions.map((c) => c.item_ID);

      const [publishedItems, comments, uploads, follows] = await Promise.all([
        itemIDs.length
          ? SELECT.from(KnowledgeItems).columns('title', 'publishedAt')
              .where({ ID: { in: itemIDs }, status: 'approved' })
          : [],
        SELECT.from(Comments).columns('content', 'createdAt')
          .where({ author_userID: userID }),
        SELECT.from(KnowledgeAttachments).columns('fileName', 'createdAt')
          .where({ createdBy: userID }),
        SELECT.from(Follows).columns('followedUser_userID', 'createdAt')
          .where({ userID, followedUser_userID: { '!=': null } }),
      ]);

      const followedIDs = follows.map((f) => f.followedUser_userID);
      const followedUsers = followedIDs.length
        ? await SELECT.from(People).columns('userID', 'displayName').where({ userID: { in: followedIDs } })
        : [];
      const nameByID = new Map(followedUsers.map((u) => [u.userID, u.displayName]));

      const entries = [
        ...publishedItems.map((i) => ({ text: `A publié « ${i.title} »`, occurredAt: i.publishedAt })),
        ...comments.map((c) => ({ text: `A commenté : « ${(c.content || '').slice(0, 60)} »`, occurredAt: c.createdAt })),
        ...uploads.map((u) => ({ text: `A déposé le document « ${u.fileName} »`, occurredAt: u.createdAt })),
        ...follows.map((f) => ({
          text: `A suivi ${nameByID.get(f.followedUser_userID) || f.followedUser_userID}`,
          occurredAt: f.createdAt,
        })),
      ];

      return entries
        .filter((e) => e.occurredAt)
        .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
        .slice(0, iLimit);
    });

    // ────────────────────────────────────────────────────────────
    // badges/publications/contributions split for the KPI cards.
    // ────────────────────────────────────────────────────────────
    this.on('getScoreBreakdown', async (req) => {
      const { userID } = req.data;
      const rows = await SELECT.from(ReputationEvents).columns('category', 'points').where({ user_userID: userID });

      const keyByCategory = { badge: 'badges', publication: 'publications', contribution: 'contributions' };
      const totals = { badges: 0, publications: 0, contributions: 0 };
      for (const { category, points } of rows) {
        const key = keyByCategory[category];
        if (key) totals[key] += points;
      }
      return totals;
    });

    // ────────────────────────────────────────────────────────────
    // "Timeline de contribution" dialog - grouped +points ledger.
    // ────────────────────────────────────────────────────────────
    this.on('getContributionTimeline', async (req) => {
      const { userID } = req.data;
      const iMonths = req.data.months || 6;
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - iMonths);

      const rows = await SELECT.from(ReputationEvents)
        .columns('points', 'label', 'occurredAt')
        .where({ user_userID: userID })
        .orderBy('occurredAt desc');

      return rows
        .filter((r) => r.occurredAt && new Date(r.occurredAt) >= cutoff)
        .map((r) => ({
          monthLabel: capitalize(MONTH_FORMATTER.format(new Date(r.occurredAt))),
          points: r.points,
          label: r.label,
          occurredAt: r.occurredAt,
        }));
    });

    // ────────────────────────────────────────────────────────────
    // "Am I viewing my own profile?" - trivial from req.user, no query.
    // ────────────────────────────────────────────────────────────
    this.on('getMyUserID', (req) => req.user.id);

    return super.init();
  }
}
