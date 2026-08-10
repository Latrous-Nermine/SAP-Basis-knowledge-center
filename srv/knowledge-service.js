import cds from '@sap/cds';
import { canTransition, isContributor } from './domain/KnowledgeWorkflow.js';
import { makeSearchCaseInsensitive } from './domain/CaseInsensitiveSearch.js';

/**
 * Handler for KnowledgeService. Stays thin: reads req, delegates the
 * state-machine rule to KnowledgeWorkflow.js, runs one transaction, returns.
 */
export default class KnowledgeService extends cds.ApplicationService {

  async init() {
    const {
      KnowledgeItems, KnowledgeContributors, KnowledgeRelations,
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

    // Title search (KnowledgeList.controller.js) - case-insensitive, see
    // CaseInsensitiveSearch.js for why this is a backend query rewrite.
    this.before('READ', 'KnowledgeItems', (req) => {
      makeSearchCaseInsensitive(req.query);
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
