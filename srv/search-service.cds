/**
 * ============================================================
 *  SearchService  —  LOT 2
 * ============================================================
 *  Exposed at /odata/v4/search
 *
 *  Decision C4 (CLAUDE.md §5): keyword search now, behind a
 *  SearchStrategy interface (srv/domain/search/SearchStrategy.js) so a
 *  semantic/vector strategy can slot in later without touching this
 *  contract or any caller.
 *
 *  No entities: this service owns no data, same shape as
 *  DashboardService. Every result is read from the module that
 *  actually owns it (Knowledge Center, Questions, Experts), each
 *  through THAT module's own service connection so its own @restrict
 *  rules apply exactly as they would if the caller had queried it
 *  directly - a search result set is never allowed to show more than
 *  browsing that module yourself would. Facet counts are computed
 *  from the already-filtered result set, never before it (CLAUDE.md
 *  §7 rule 6) - a facet count must never leak the existence of a
 *  document the caller isn't allowed to read.
 * ============================================================
 */
@path    : '/odata/v4/search'
@requires: 'authenticated-user'
service SearchService {

  type SearchResultItem {
    id       : String;
    type     : String(20);   // 'knowledge' | 'question' | 'expert'
    title    : String(300);
    excerpt  : String(500);
    meta     : String(200);  // secondary line: author/status/department
    href     : String(200);  // client-side route to open it
  }

  type SearchFacet {
    type  : String(20);
    label : String(40);
    count : Integer;
  }

  type SearchResponse {
    query   : String;
    total   : Integer;
    facets  : array of SearchFacet;
    results : array of SearchResultItem;
  }

  /** type filters the result set to one facet ('knowledge' | 'question' |
      'expert'); omitted or empty means all three. */
  function search(q : String, type : String) returns SearchResponse;
}
