using { aymax.db as db } from '../db/schema';

service HRService @(path: '/odata/v4/hr') {
  entity Employees  as projection on db.Employees;
  entity Skills     as projection on db.Skills;
  entity Objectives as projection on db.Objectives;
  entity SkillGaps  as projection on db.SkillGaps;
}
