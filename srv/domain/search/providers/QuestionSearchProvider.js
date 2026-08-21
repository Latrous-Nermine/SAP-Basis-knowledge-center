import cds from '@sap/cds';
import { makeSearchCaseInsensitive } from '../../CaseInsensitiveSearch.js';

const STATUS_LABEL = { open: 'Ouverte', resolved: 'Résolue', closed: 'Fermée' };

/**
 * Reads through QuestionsService via .tx(req), same pattern as the
 * Knowledge provider - Questions has no per-row @restrict beyond
 * "authenticated user" today, but routing through the service rather
 * than cds.db means Search automatically inherits any row-level
 * restriction Lot 3 adds to Questions later, without needing its own
 * rewrite (CLAUDE.md §7 rule 7: every provider owns its own restriction).
 */
export default class QuestionSearchProvider {
  type = 'question';
  label = 'Questions & Réponses';

  async search(q, req) {
    const questionsSrv = await cds.connect.to('QuestionsService');
    const { Questions } = questionsSrv.entities;

    const p = `%${q}%`;
    const query = SELECT.from(Questions)
      .columns('ID', 'title', 'content', 'status')
      .where`title like ${p} or content like ${p}`
      .limit(10);
    makeSearchCaseInsensitive(query);

    const rows = await questionsSrv.tx(req).run(query);
    return rows.map((row) => ({
      id: row.ID,
      type: this.type,
      title: row.title,
      excerpt: (row.content || '').slice(0, 200),
      meta: STATUS_LABEL[row.status] || row.status,
      href: `#/questions/${row.ID}`,
    }));
  }
}
