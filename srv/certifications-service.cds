using { aymax.knowledgehub as kh } from '../db/lot3';

/**
 * ============================================================
 *  CertificationsService  —  LOT 3 (integrated from `Riadh`)
 * ============================================================
 *  Exposed at /odata/v4/certifications
 *
 *  Catalog management + per-user assignment/progress. Projects onto
 *  the SAME entities Lot 2's PeopleService already reads for Profile
 *  display (kh.Certifications / kh.UserCertifications, db/lot2.cds) -
 *  this is a second, independently-restricted service over the same
 *  data for a different purpose (admin catalog management), not a
 *  duplicate entity. PeopleService stays read-only for Profile;
 *  write access to UserCertifications lives here instead, since
 *  managing who's assigned what is an HR/management action, not
 *  something Profile itself should expose.
 * ============================================================
 */
@path    : '/odata/v4/certifications'
@requires: 'authenticated-user'
service CertificationsService {

  @readonly
  entity Certifications as projection on kh.Certifications;

  @readonly
  entity CertificationSkills as projection on kh.CertificationSkills;

  @restrict: [
    { grant: 'READ',   where: 'user_userID = $user.id' },
    /** TEAM: a Manager sees/manages only their own department's
        certifications, not everyone's - $user.department comes from
        the mocked-auth attr config (package.json) locally, from the
        real XSUAA token attribute later. HR/Administrator stay
        unscoped (FULL, per the permission matrix). */
    { grant: 'READ',                         where: 'user.department = $user.department', to: ['Manager'] },
    { grant: 'READ',                         to: ['HR', 'Administrator'] },
    { grant: ['CREATE', 'UPDATE', 'DELETE'], where: 'user.department = $user.department', to: ['Manager'] },
    { grant: ['CREATE', 'UPDATE', 'DELETE'], to: ['HR', 'Administrator'] }
  ]
  entity UserCertifications as projection on kh.UserCertifications;

  // Convenience views matching the UI's earned/inProgress/recommended
  // buckets - status literals match Lot 2's existing enum
  // (earned/in_progress/recommended, db/lot2.cds), not Riadh's
  // original camelCase, since UserCertifications is Lot 2's entity.
  @readonly entity Earned      as select from UserCertifications where status = 'earned';
  @readonly entity InProgress  as select from UserCertifications where status = 'in_progress';
  @readonly entity Recommended as select from UserCertifications where status = 'recommended';

  /** Self-service: mark one of MY OWN recommended certifications as
      started. Not a raw property PATCH (what Riadh's original UI did)
      for two reasons: CDS views (Earned/InProgress/Recommended above)
      aren't updatable through OData at all, and every other controlled
      state transition in this codebase already goes through an action
      (voteItem, submitForReview, ...), not raw PATCH - same pattern,
      not a new one. */
  action startCertification(userCertificationID: UUID) returns Boolean;
}
