using { aymax.knowledgehub as kh } from '../db/lot3';

/**
 * ============================================================
 *  DepotService  —  LOT 3 (Project Submission, integrated from `Riadh`)
 * ============================================================
 *  Exposed at /odata/v4/depot
 *
 *  Riadh's original also exposed a read-only `Employees` passthrough
 *  here (for showing who uploaded a file) - dropped, since Employees
 *  no longer exists; uploadedBy is a normal UserProfiles association
 *  now, resolvable via PeopleService the same way Knowledge Center
 *  resolves contributor display names.
 * ============================================================
 */
@path    : '/odata/v4/depot'
@requires: 'authenticated-user'
service DepotService {

  @restrict: [
    { grant: 'READ',   where: 'uploadedBy_userID = $user.id' },
    { grant: 'READ',                to: ['DepartmentManager', 'HR', 'Admin'] },
    { grant: 'CREATE',              to: ['Employee', 'Intern', 'DepartmentManager', 'HR', 'Admin'] },
    { grant: 'DELETE', where: 'uploadedBy_userID = $user.id' },
    { grant: 'DELETE',              to: ['Admin'] }
  ]
  entity DepotFiles as projection on kh.DepotFiles;
}
