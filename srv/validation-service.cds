using { aymax.db as db } from '../db/schema';

service ValidationService @(path: '/odata/v4/validation') {
  entity ValidationItems as projection on db.ValidationItems;
}
