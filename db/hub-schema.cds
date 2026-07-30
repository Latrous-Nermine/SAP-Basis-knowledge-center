namespace aymax.db;

using { cuid, managed } from '@sap/cds/common';

/* ──────────────── HR ──────────────── */

entity Employees : cuid, managed {
  name               : String(120);
  initials           : String(4);
  dept               : String(80);
  level              : String(40);   // Contributeur, Expert...
  reputation         : Integer default 0;
  objStatus          : String(20) enum { ontrack; atrisk; done; };
  objectiveTitle     : String(200);
  certsEarnedCount   : Integer default 0;
  certsProgressCount : Integer default 0;

  skills             : Composition of many Skills on skills.employee = $self;
  certifications     : Association to many EmployeeCertifications on certifications.employee = $self;
  reportsAsIntern    : Association to many Rapports on reportsAsIntern.intern = $self;
  reportsAsTutor     : Association to many Rapports on reportsAsTutor.tutor = $self;
  validationItems    : Association to many ValidationItems on validationItems.author = $self;
  depotFiles         : Association to many DepotFiles on depotFiles.uploadedBy = $self;
}

entity Skills : cuid {
  employee : Association to Employees;
  name     : String(80);
  stars    : String(10);   // display glyphs, e.g. "★★★★☆"
  percent  : Integer;
}

entity Objectives : cuid {
  title  : String(200);
  owner  : String(80);     // department
  due    : String(40);     // free text, e.g. "Sept. 2026"
  status : String(20) enum { ontrack; atrisk; done; };
}

entity SkillGaps : cuid {
  name      : String(80);
  percent   : Integer;
  headcount : Integer;
}

/* ──────────────── Certifications ──────────────── */

entity Certifications : cuid {
  name         : String(150);
  description  : String(500);
  provider     : String(80);
  recArticles  : Integer default 0;
  recQuestions : Integer default 0;

  tags         : Composition of many CertificationSkills on tags.certification = $self;
  assignments  : Association to many EmployeeCertifications on assignments.certification = $self;
}

entity CertificationSkills : cuid {
  certification : Association to Certifications;
  tag           : String(60);
}

// Bridge entity: tracks each employee's status per certification
// (recommended / inProgress / earned) instead of duplicating rows.
entity EmployeeCertifications : cuid {
  employee      : Association to Employees;
  certification : Association to Certifications;
  status        : String(20) enum { recommended; inProgress; earned; };
  progress      : Integer default 0;
  startDate     : Date;
  earnedDate    : Date;
}

/* ──────────────── Validation (content review queue) ──────────────── */

entity ValidationItems : cuid {
  title     : String(250);
  category  : String(60);
  author    : Association to Employees;
  dept      : String(80);
  excerpt   : String(1000);
  status    : String(20) enum { pending; approved; rejected; };
  createdAt : Timestamp @cds.on.insert: $now;
}

/* ──────────────── Rewards ──────────────── */

entity Rewards : cuid {
  name   : String(120);
  points : Integer;
}

/* ──────────────── Rapports de stage ──────────────── */

entity Rapports : cuid, managed {
  title   : String(250);
  period  : String(60);
  body    : LargeString;
  status  : String(20) enum { draft; submitted; validated; };
  intern  : Association to Employees;
  tutor   : Association to Employees;
  history : Composition of many RapportHistory on history.rapport = $self;
}

entity RapportHistory : cuid {
  rapport : Association to Rapports;
  text    : String(200);
  time    : Timestamp @cds.on.insert: $now;
}

/* ──────────────── Rapports dashboard (aggregates) ──────────────── */
// Kept as plain tables for now; in production these would be
// CDS analytic views computed from ValidationItems/Rapports/Employees.

entity DashboardKPIs : cuid {
  label : String(80);
  value : String(20);
  delta : String(80);
  state : String(20);   // Success / Warning / Information / Error
}

entity DepartmentStats : cuid {
  dept   : String(80);
  pubs   : Integer;
  solved : Integer;
  avgRep : Integer;
}

/* ──────────────── Dépôt de projet (file manager) ──────────────── */

entity DepotFiles : cuid {
  name       : String(200);
  size       : String(20);   // display string, e.g. "2.4 MB"
  type       : String(10);   // pdf, zip, doc, docx, png, jpg...
  uploadedBy : Association to Employees;
  uploadedAt : Timestamp @cds.on.insert: $now;
}

/* ──────────────── Admin ──────────────── */

entity Roles : cuid {
  name  : String(60);
  desc  : String(200);
  count : Integer;
}

// Flat model matching the permission-matrix UI directly.
entity Permissions : cuid {
  name     : String(120);
  admin    : Boolean default false;
  manager  : Boolean default false;
  hr       : Boolean default false;
  employee : Boolean default false;
  intern   : Boolean default false;
}
