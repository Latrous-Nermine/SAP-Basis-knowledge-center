using { aymax.knowledgehub as kh } from '../db/lot3';

/**
 * ============================================================
 *  RewardsService  —  LOT 3 (integrated from `Riadh`)
 * ============================================================
 *  Exposed at /odata/v4/rewards
 * ============================================================
 */
@path    : '/odata/v4/rewards'
@requires: 'authenticated-user'
service RewardsService {

  @restrict: [
    { grant: 'READ',                        to: ['Employee', 'Intern', 'Manager', 'HR', 'Administrator'] },
    { grant: ['CREATE', 'UPDATE', 'DELETE'], to: ['HR', 'Administrator'] }
  ]
  entity Rewards as projection on kh.Rewards;
}
