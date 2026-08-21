import cds from '@sap/cds';
import { KeywordSearchStrategy } from './domain/search/SearchStrategy.js';
import KnowledgeSearchProvider from './domain/search/providers/KnowledgeSearchProvider.js';
import QuestionSearchProvider from './domain/search/providers/QuestionSearchProvider.js';
import ExpertSearchProvider from './domain/search/providers/ExpertSearchProvider.js';

const ALL_PROVIDERS = [
  new KnowledgeSearchProvider(),
  new QuestionSearchProvider(),
  new ExpertSearchProvider(),
];
const strategy = new KeywordSearchStrategy();

/**
 * Thin handler: resolves which providers to run, delegates the actual
 * search + merge to the strategy, returns. No business logic here -
 * see SearchStrategy.js and the individual providers.
 */
export default class SearchService extends cds.ApplicationService {
  async init() {
    this.on('search', async (req) => {
      const { q, type } = req.data;
      const query = (q || '').trim();
      if (!query) return { query: '', total: 0, facets: [], results: [] };

      const providers = type
        ? ALL_PROVIDERS.filter((p) => p.type === type)
        : ALL_PROVIDERS;

      const { results, facets } = await strategy.search(query, providers, req);
      return { query, total: results.length, facets, results };
    });

    return super.init();
  }
}
