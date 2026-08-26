using { aymax.knowledgehub as kh } from '../db/lot3';

/**
 * ============================================================
 *  HRService  —  LOT 3 (integrated from `Riadh`)
 * ============================================================
 *  Exposed at /odata/v4/hr
 *
 *  Riadh's original `Employees`/`Skills` entities are not brought
 *  back as their own tables - individual skill/reputation data
 *  already lives on UserProfiles/UserSkills (Lot 2, PeopleService).
 *  `Employees` below is a projection ON that same UserProfiles data,
 *  scoped to the fields the HR employee directory needs and
 *  restricted to management roles - not a second copy of it.
 * ============================================================
 */
@path    : '/odata/v4/hr'
@requires: 'authenticated-user'
service HRService {

  /** HR employee directory - a management-only view over Lot 2's
      UserProfiles, not a duplicate entity. certsEarnedCount/
      certsProgressCount are computed in hr-service.js from
      UserCertifications, same pattern as PeopleService's
      followersCount/expertiseLevel. */
  @readonly
  @restrict: [
    { grant: 'READ', to: ['Manager', 'HR', 'Administrator'] }
  ]
  entity Employees as projection on kh.UserProfiles {
    key userID,
        displayName     as name,
        department      as dept,
        hrLevel         as level,
        reputation,
        objectiveStatus as objStatus,
        objectiveTitle,
        avatarMimeType,
        skills          : redirected to Skills,
        virtual certsEarnedCount   : Integer,
        virtual certsProgressCount : Integer
  };

  @readonly
  entity Skills as projection on kh.UserSkills;

  @restrict: [
    { grant: 'READ',                        to: ['Manager', 'HR', 'Administrator'] },
    { grant: ['CREATE', 'UPDATE', 'DELETE'], to: ['HR', 'Administrator'] }
  ]
  entity Objectives as projection on kh.Objectives;

  @restrict: [
    { grant: 'READ',                        to: ['Manager', 'HR', 'Administrator'] },
    { grant: ['CREATE', 'UPDATE', 'DELETE'], to: ['HR', 'Administrator'] }
  ]
  entity SkillGaps as projection on kh.SkillGaps;
}
