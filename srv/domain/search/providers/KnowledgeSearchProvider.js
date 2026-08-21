import cds from '@sap/cds';
import { makeSearchCaseInsensitive } from '../../CaseInsensitiveSearch.js';

/**
 * Reads through KnowledgeService itself (not cds.db) via .tx(req), so
 * KnowledgeItems' own row-level @restrict (approved-only, or a
 * contributor's own draft/pending items) applies exactly as it would
 * if the caller browsed Knowledge Center directly - a search result
 * can never show a confidential or unapproved item the caller
 * couldn't otherwise open (CLAUDE.md §7 rule 7).
 */
export default class KnowledgeSearchProvider {
  type = 'knowledge';
  label = 'Centre de connaissances';

  async search(q, req) {
    const knowledgeSrv = await cds.connect.to('KnowledgeService');
    const { KnowledgeItems } = knowledgeSrv.entities;

    const p = `%${q}%`;
    const query = SELECT.from(KnowledgeItems)
      .columns('ID', 'title', 'excerpt', 'category', 'status')
      .where`title like ${p} or content like ${p} or excerpt like ${p}`
      .limit(10);
    makeSearchCaseInsensitive(query);

    const rows = await knowledgeSrv.tx(req).run(query);
    return rows.map((row) => ({
      id: row.ID,
      type: this.type,
      title: row.title,
      excerpt: row.excerpt || '',
      // Not assuming "this must be mine" - a Manager/Administrator can
      // legitimately see someone else's pending item here too, per the
      // same @restrict rule this query already ran under.
      meta: STATUS_LABEL[row.status] || row.status,
      href: `#/knowledge/${row.ID}`,
    }));
  }
}

const STATUS_LABEL = {
  approved: 'Article approuvé',
  pending: 'En attente de validation',
  draft: 'Brouillon',
  rejected: 'Rejeté',
};
