using { aymax.db as db } from '../db/hub-schema';

service DepotService @(path: '/odata/v4/depot') {
  entity DepotFiles as projection on db.DepotFiles;
}
