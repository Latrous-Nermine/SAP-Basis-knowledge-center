using { aymax.knowledgehub as kh } from '../db/lot3';

/**
 * ============================================================
 *  AdminService  —  LOT 3 (integrated from the `Riadh` branch)
 * ============================================================
 *  Exposed at /odata/v4/admin
 *
 *  Role/permission configuration - Administrator-only end to end. Riadh's
 *  original branch had no @requires/@restrict anywhere; this is new,
 *  not carried over, since role-config data has no legitimate reason
 *  to be readable outside Administrator.
 * ============================================================
 */
@path    : '/odata/v4/admin'
@requires: 'Administrator'
service AdminService {
  entity Roles       as projection on kh.Roles;
  entity Permissions as projection on kh.Permissions;
}
