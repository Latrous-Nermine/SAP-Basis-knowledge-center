/**
 * Decision C4 (CLAUDE.md §5): "Search is keyword now (phase 1), behind
 * a SearchStrategy interface so vector/semantic search can slot in
 * later without touching callers." This is that seam.
 *
 * The contract: a strategy exposes async search(q, providers, req) and
 * returns { results, facets }. search-service.js is the only caller,
 * and only ever depends on this shape - swapping KeywordSearchStrategy
 * for a future SemanticSearchStrategy is a one-line change there.
 *
 * providers is the list of per-module SearchProvider instances
 * (KnowledgeSearchProvider, QuestionSearchProvider,
 * ExpertSearchProvider, ...) - each one owns its own module's query
 * and its own authorization (CLAUDE.md §7 rule 7), this strategy only
 * merges what they return.
 */
export class KeywordSearchStrategy {
  async search(q, providers, req) {
    const perProvider = await Promise.all(
      providers.map(async (provider) => {
        try {
          const results = await provider.search(q, req);
          return { type: provider.type, label: provider.label, results };
        } catch (err) {
          // One module's query failing (e.g. a downstream service
          // hiccup) must not take down the other two facets.
          console.error(`Search provider '${provider.type}' failed:`, err.message);
          return { type: provider.type, label: provider.label, results: [] };
        }
      }),
    );

    // Facet counts computed from the results actually returned above -
    // i.e. already past each provider's own authorization filtering,
    // never a separate unrestricted count query (CLAUDE.md §7 rule 6).
    const facets = perProvider.map((p) => ({ type: p.type, label: p.label, count: p.results.length }));
    const results = perProvider.flatMap((p) => p.results);

    return { results, facets };
  }
}
