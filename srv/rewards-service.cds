using { aymax.db as db } from '../db/hub-schema';

service RewardsService @(path: '/odata/v4/rewards') {
  entity Rewards as projection on db.Rewards;
}
