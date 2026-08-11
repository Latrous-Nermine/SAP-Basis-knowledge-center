using { aymax.db as db } from '../db/schema';

service DepotService @(path: '/odata/v4/depot') {
  entity DepotFiles as projection on db.DepotFiles;
  @readonly entity Employees as projection on db.Employees;
}
