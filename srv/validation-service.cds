using { aymax.knowledgehub as kh } from '../db/lot3';

/**
 * ============================================================
 *  ValidationService  —  LOT 3 (integrated from `Riadh`)
 * ============================================================
 *  Exposed at /odata/v4/validation
 *
 *  A separate review queue from Knowledge Center's own
 *  submitForReview/approveItem/rejectItem workflow (db/lot2.cds,
 *  srv/knowledge-service.*) - ValidationItems has no overlap with
 *  KnowledgeItems, kept as its own entity/queue rather than merged.
 * ============================================================
 */
@path    : '/odata/v4/validation'
@requires: 'authenticated-user'
service ValidationService {

  @restrict: [
    { grant: 'READ',   where: 'author_userID = $user.id' },
    { grant: 'READ',                to: ['DepartmentManager', 'HR', 'Admin'] },
    { grant: 'CREATE',              to: ['Employee', 'Intern', 'DepartmentManager', 'HR', 'Admin'] },
    { grant: 'UPDATE', where: 'status = ''pending''', to: ['DepartmentManager', 'Admin'] }
  ]
  entity ValidationItems as projection on kh.ValidationItems {
    *,
    /** UserProfiles isn't exposed as its own entity in this service,
        so `author` has no expandable navigation target - flattened
        one level instead, same pattern PeopleService already uses for
        UserTechnologies (tag.name as technologyName). `author` itself
        stays projected (unexpandable, but its FK column author_userID
        is what the @restrict where-clause above resolves against). */
    author.displayName as authorName : String(100)
  };

  /** Riadh's original ValidationCounts was a persistent counter entity
      manually kept in sync in SQLite - replaced with a computed
      function (same approach Knowledge Center already uses for
      getCategoryCounts()) so there's nothing to drift out of sync. */
  @requires: ['DepartmentManager', 'HR', 'Admin']
  function getValidationCounts() returns {
    pending  : Integer;
    approved : Integer;
    rejected : Integer;
    total    : Integer;
  };
}
