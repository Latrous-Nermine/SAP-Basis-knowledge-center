using { aymax.db as db } from '../db/hub-schema';

service RapportsDashService @(path: '/odata/v4/rapports') {
  @readonly entity KPIs             as projection on db.DashboardKPIs;
  @readonly entity DepartmentStats  as projection on db.DepartmentStats;
}
