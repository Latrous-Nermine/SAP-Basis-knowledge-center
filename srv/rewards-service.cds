using { aymax.db as db } from '../db/schema';

service RewardsService @(path: '/odata/v4/rewards') {
  entity Rewards as projection on db.Rewards;
}
