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

  /** Permission matrix: Employee=NONE (no grant at all - previously had
      CREATE, removed), Intern=OWN, Manager=TEAM (own department),
      HR=READONLY (READ only, no CREATE/DELETE), Administrator=FULL. */
  @restrict: [
    { grant: 'READ',   where: 'uploadedBy_userID = $user.id',             to: ['Intern'] },
    { grant: 'READ',   where: 'uploadedBy.department = $user.department', to: ['Manager'] },
    { grant: 'READ',                                                      to: ['HR', 'Administrator'] },
    { grant: 'CREATE',                                                    to: ['Intern', 'Manager'] },
    { grant: 'DELETE', where: 'uploadedBy_userID = $user.id',             to: ['Intern'] },
    { grant: 'DELETE', where: 'uploadedBy.department = $user.department', to: ['Manager'] },
    { grant: ['CREATE', 'DELETE'],                                        to: ['Administrator'] }
  ]
  entity DepotFiles as projection on kh.DepotFiles;
}
