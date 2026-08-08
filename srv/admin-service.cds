using { aymax.db as db } from '../db/schema';

service AdminService @(path: '/odata/v4/admin') {
  entity Roles       as projection on db.Roles;
  entity Permissions as projection on db.Permissions;
}
