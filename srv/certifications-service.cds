using { aymax.db as db } from '../db/schema';

service CertificationsService @(path: '/odata/v4/certifications') {
  entity Certifications          as projection on db.Certifications;
  entity CertificationSkills     as projection on db.CertificationSkills;
  entity EmployeeCertifications  as projection on db.EmployeeCertifications;

  // Convenience views matching the UI's earned/inProgress/recommended buckets
  view Earned      as select from EmployeeCertifications where status = 'earned';
  view InProgress  as select from EmployeeCertifications where status = 'inProgress';
  view Recommended as select from EmployeeCertifications where status = 'recommended';
}
