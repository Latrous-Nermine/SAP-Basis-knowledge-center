using { aymax.db as db } from '../db/hub-schema';

service RapportsStageService @(path: '/odata/v4/rapports-stage') {
  entity Rapports       as projection on db.Rapports;
  entity RapportHistory as projection on db.RapportHistory;
}
