/**
 * ============================================================
 *  LOT 3  —  Riadh
 *  HR · Certifications · Internship Reports · Reports ·
 *  Project Submission · Rewards · Admin · Validation
 * ============================================================
 *
 *  Integrated from the `Riadh` branch (2026-08). His original schema
 *  introduced a second, parallel identity entity - `Employees` (cuid-
 *  keyed) - instead of using `UserProfiles` (String(255) userID, the
 *  actual XSUAA/mocked-auth identity every @restrict rule in this
 *  codebase compares against via $user.id). That's not a naming
 *  difference, it's two different answers to "who is the current
 *  user" - so it's not preserved here. Every association that pointed
 *  at Employees now points at UserProfiles instead, exactly like every
 *  other Lot 2 entity already does.
 *
 *  His Skills / Certifications / EmployeeCertifications also
 *  duplicated Lot 2's already-built UserSkills / Certifications /
 *  UserCertifications (Profile module) field-for-field in spirit, if
 *  not in exact shape - extended here (new fields only), not
 *  redefined, per "if it's about the profile, it stays Lot 2's."
 *
 *  His own rewrite of Lot 1's Posts/Rooms/Tags/Comments/Likes/
 *  PostDocuments/UserProfiles (db/hub-schema.cds on his branch) is
 *  NOT brought over here at all - that's Lot 1 territory, explicitly
 *  deferred to the future Lot 1 integration, not something to resolve
 *  unilaterally today.
 *
 *  OWNERSHIP RULES
 *  - This file is owned by Lot 3. Lot 2 doesn't edit it.
 *  - db/schema.cds (Lot 1) and db/lot2.cds (Lot 2) are NEVER edited
 *    from here - shared entities are extended, never redefined.
 * ============================================================
 */

namespace aymax.knowledgehub;

using { cuid, managed } from '@sap/cds/common';
using { aymax.knowledgehub.UserProfiles } from './schema';
using {
  aymax.knowledgehub.Certifications,
  aymax.knowledgehub.UserCertifications
} from './lot2';


// ============================================================
// HR
// ------------------------------------------------------------
// Employees (Riadh's) is gone - name/dept/reputation already exist on
// UserProfiles (displayName/department/reputation, Lot 1 + Lot 2). Only
// the fields with no existing home land here.
// ============================================================

extend UserProfiles with {
  /** Riadh's Employees.level ("Contributeur"/"Expert"...) - distinct
      from UserProfiles.role (Employee/DepartmentManager/HR/Admin/Intern,
      an RBAC role) and from Experts' expertiseLevel (computed from
      reputation) - this is a separate, HR-assigned rating. */
  hrLevel            : String(40);
  objectiveStatus    : String(20) enum { ontrack; atrisk; done };
  objectiveTitle     : String(200);
}

/** Department-level (not per-employee - Riadh's own Objectives.owner
    was already "department", distinct from the per-employee
    objectiveTitle/objectiveStatus above). */
entity Objectives : cuid {
  title  : String(200);
  owner  : String(80);
  due    : String(40);
  status : String(20) enum { ontrack; atrisk; done };
}

entity SkillGaps : cuid {
  name      : String(80);
  percent   : Integer;
  headcount : Integer;
}


// ============================================================
// CERTIFICATIONS
// ------------------------------------------------------------
// Catalog + per-user status already exist (db/lot2.cds). Extended
// with Riadh's extra fields, not redefined - his admin-facing catalog
// management and Lot 2's Profile display both read/write the same rows.
// ============================================================

extend Certifications with {
  description  : String(500);
  recArticles  : Integer default 0;
  recQuestions : Integer default 0;
  tags         : Composition of many CertificationSkills on tags.certification = $self;
}

entity CertificationSkills : cuid {
  certification : Association to Certifications;
  tag           : String(60);
}

extend UserCertifications with {
  /** Riadh's only field UserCertifications didn't already have -
      earned/in_progress/recommended already covers status, this is
      the in-progress completion percentage. */
  progress : Integer default 0;
}


// ============================================================
// VALIDATION (content review queue)
// ------------------------------------------------------------
// A separate queue from Knowledge Center's own submitForReview/
// approveItem workflow (db/lot2.cds) - Riadh's ValidationItems has no
// overlap with KnowledgeItems, kept as its own entity.
// ============================================================

entity ValidationItems : cuid, managed {
  title     : String(250);
  category  : String(60);
  author    : Association to UserProfiles;
  dept      : String(80);
  excerpt   : String(1000);
  status    : String(20) enum { pending; approved; rejected } default 'pending';
}


// ============================================================
// REWARDS
// ============================================================

entity Rewards : cuid {
  name     : String(120);
  points   : Integer;
  category : String(60);
  icon     : String(60);
}


// ============================================================
// INTERNSHIP REPORTS (Rapports de stage)
// ============================================================

entity Rapports : cuid, managed {
  title   : String(250);
  period  : String(60);
  body    : LargeString;
  status  : String(20) enum { draft; submitted; validated } default 'draft';
  intern  : Association to UserProfiles;
  tutor   : Association to UserProfiles;
  history : Composition of many RapportHistory on history.rapport = $self;
}

entity RapportHistory : cuid {
  rapport : Association to Rapports;
  text    : String(200);
  time    : Timestamp @cds.on.insert: $now;
}


// ============================================================
// REPORTS DASHBOARD (aggregates)
// ------------------------------------------------------------
// Kept as plain tables per Riadh's own original note ("in production
// these would be CDS analytic views"). Feeding these into
// DashboardService's own role-based strategies (rather than staying a
// separate read here) is a deliberately separate follow-up - Dashboard
// already has real architecture (providers/strategies per role) this
// shouldn't be bolted onto without the same care.
// ============================================================

entity DashboardKPIs : cuid {
  label : String(80);
  value : String(20);
  delta : String(80);
  state : String(20);
}

entity DepartmentStats : cuid {
  dept   : String(80);
  pubs   : Integer;
  solved : Integer;
  avgRep : Integer;
}


// ============================================================
// PROJECT SUBMISSION (Dépôt de projet)
// ============================================================

entity DepotFiles : cuid {
  name       : String(200);
  size       : String(20);
  type       : String(10);
  uploadedBy : Association to UserProfiles;
  uploadedAt : Timestamp @cds.on.insert: $now;
}


// ============================================================
// ADMIN
// ============================================================

entity Roles : cuid {
  name  : String(60);
  desc  : String(200);
  count : Integer;
}

entity Permissions : cuid {
  name     : String(120);
  admin    : Boolean default false;
  manager  : Boolean default false;
  hr       : Boolean default false;
  employee : Boolean default false;
  intern   : Boolean default false;
}
