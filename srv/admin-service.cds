using { aymax.knowledgehub as kh } from '../db/lot3';

/**
 * ============================================================
 *  AdminService  —  LOT 3 (integrated from the `Riadh` branch)
 * ============================================================
 *  Exposed at /odata/v4/admin
 *
 *  Role/permission configuration. Riadh's original branch had no
 *  @requires/@restrict anywhere; this is new, not carried over.
 *
 *  Permission matrix: Employee/Intern/Manager = NONE, HR = LIMITED
 *  (read-only Roles, for reference - not Permissions, that stays
 *  Administrator-only), Administrator = FULL. Service-level @requires
 *  loosened from 'Administrator' to 'authenticated-user' so HR can
 *  reach the service at all; each entity's own @restrict does the
 *  real gating from here.
 * ============================================================
 */
@path    : '/odata/v4/admin'
@requires: 'authenticated-user'
service AdminService {

  @restrict: [
    { grant: 'READ',                         to: ['HR', 'Administrator'] },
    { grant: ['CREATE', 'UPDATE', 'DELETE'], to: ['Administrator'] }
  ]
  entity Roles as projection on kh.Roles;

  @restrict: [
    { grant: '*', to: ['Administrator'] }
  ]
  entity Permissions as projection on kh.Permissions;
}
