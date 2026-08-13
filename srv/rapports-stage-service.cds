using { aymax.knowledgehub as kh } from '../db/lot3';

/**
 * ============================================================
 *  RapportsStageService  —  LOT 3 (Internship Reports, from `Riadh`)
 * ============================================================
 *  Exposed at /odata/v4/rapports-stage
 *
 *  RapportHistory gets its OWN @restrict below, walked through the
 *  `rapport` association - a sub-entity with no restrict of its own
 *  is directly queryable regardless of the parent's, the same gap
 *  found and fixed twice already in Knowledge Center this session
 *  (KnowledgeContributors/Attachments/etc.). Not repeating it here.
 * ============================================================
 */
@path    : '/odata/v4/rapports-stage'
@requires: 'authenticated-user'
service RapportsStageService {

  @restrict: [
    { grant: 'READ',   where: 'intern_userID = $user.id or tutor_userID = $user.id' },
    { grant: 'READ',                to: ['DepartmentManager', 'HR', 'Admin'] },
    { grant: 'CREATE',              to: ['Intern'] },
    { grant: 'UPDATE', where: 'intern_userID = $user.id and status = ''draft''' },
    { grant: 'UPDATE',              to: ['DepartmentManager', 'HR', 'Admin'] }
  ]
  entity Rapports as projection on kh.Rapports {
    *,
    history : redirected to RapportHistory
  };

  @restrict: [
    { grant: 'READ', where: 'rapport.intern_userID = $user.id or rapport.tutor_userID = $user.id' },
    { grant: 'READ', to: ['DepartmentManager', 'HR', 'Admin'] }
  ]
  entity RapportHistory as projection on kh.RapportHistory;

  /** Draft -> submitted transition. Not a plain PATCH on `status`: this
      also appends a RapportHistory row, so it needs its own transactional
      action, same reasoning as CertificationsService#startCertification.
      RapportHistory itself has no CREATE grant above - the only way a
      history row is ever written is through this action. */
  @requires: 'Intern'
  action submitRapport(rapportID: UUID) returns Boolean;
}
