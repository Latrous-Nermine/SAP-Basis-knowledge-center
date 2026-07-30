/**
 * ============================================================
 *  LOT 2  —  Sami
 *  Search · Experts · Knowledge Center · Notifications ·
 *  Profile · Dashboard
 * ============================================================
 *
 *  OWNERSHIP RULES
 *  - This file is owned by Lot 2. Only Lot 2 edits it.
 *  - db/schema.cds (Lot 1) is NEVER edited from here.
 *  - Shared entities (UserProfiles, Posts, Rooms, Tags) are
 *    REFERENCED via `using`, never redefined.
 *
 *  CAP loads every .cds file under db/ automatically, so this
 *  file needs no registration anywhere.
 *
 *  ROADMAP (added one module at a time, after each is tested)
 *    [x] Notifications
 *    [x] Knowledge Center        <- current step
 *    [ ] ActivityEvents + ReputationRules + Levels
 *    [ ] Skills / UserSkills
 *    [ ] Badges / UserBadges
 *    [ ] Favorites / RelatedContent / SearchLog
 * ============================================================
 */

namespace aymax.knowledgehub;

using { cuid, managed } from '@sap/cds/common';
using {
  aymax.knowledgehub.UserProfiles,
  aymax.knowledgehub.Tags,
  aymax.knowledgehub.Comments
} from './schema';


// ============================================================
// TYPES
// ------------------------------------------------------------
// Named with a `Notification` prefix on purpose: these types
// live in the SHARED namespace `aymax.knowledgehub`, so a
// generic name like `Severity` would collide the day another
// lot defines its own.
// ============================================================

type NotificationType : String(30) enum {
  // --- from the UI design (Notifications.html) ---
  COMMENT;                  // "X a commenté votre publication"
  MENTION;                  // "X vous a mentionné dans une réponse"
  ANSWER_ACCEPTED;          // "Votre réponse a été acceptée comme solution"
  ARTICLE_PUBLISHED;        // "Nouvel article publié dans le Sujet Y"
  DOC_PUBLISHED;            // "Nouvelle documentation publiée"
  ROOM_POST;                // "X a publié dans la room Y"
  BADGE_EARNED;             // "Badge « Contributeur Expert » débloqué"
  CERTIFICATION_COMPLETED;  // "Certification « SAP BTP Associate » terminée"
  RECOMMENDATION;           // "L'article Z pourrait vous intéresser"
  // --- required by the cahier des charges §4.7 ---
  VALIDATION_REQUESTED;     // manager: "un contenu attend votre validation"
  VALIDATION_RESULT;        // author:  "votre contenu a été approuvé / rejeté"
  UPDATE_REMINDER;          // "cette procédure n'a pas été revue depuis 12 mois"
  SECURITY_EVENT;           // AI Security Guardian / accès sensible
}

type NotificationSource : String(20) enum {
  POST; COMMENT; ROOM; BADGE; CERTIFICATION; USER; SYSTEM;
}

type NotificationSeverity : String(10) enum {
  INFO; WARNING; CRITICAL;
}


// ============================================================
// NOTIFICATIONS
// ------------------------------------------------------------
// A recipient-centric inbox. One event in the application can
// produce MANY rows here (the author, everyone mentioned,
// everyone following the room) — which is exactly why this is
// not the same table as the activity log.
//
// Append-mostly: rows are INSERTed once, and the only field
// ever UPDATEd is `isRead`/`readAt`.
// ============================================================

entity Notifications : cuid {

  /** Who must see this. FK column is `recipient_userID` (String
      255) because UserProfiles is keyed on the XSUAA id, not a UUID. */
  recipient   : Association to UserProfiles  @mandatory;

  type        : NotificationType             @mandatory;

  severity    : NotificationSeverity default #INFO;

  /** Polymorphic target: which kind of object this is about … */
  sourceType  : NotificationSource;
  /** … and which one. Deliberately NOT a foreign key — see the
      design note in the guide. Always render defensively: the
      target may have been deleted. */
  sourceId    : UUID;

  /** JSON, e.g. {"actorName":"Karim Trabelsi","title":"Migration HANA"}.
      NEVER store a rendered sentence here — the frontend builds the
      text from an i18n key + these parameters, so the app stays
      translatable and titles never go stale. */
  params      : LargeString;

  isRead      : Boolean default false;

  createdAt   : Timestamp @cds.on.insert : $now;
  readAt      : Timestamp;
}


// ============================================================
// KNOWLEDGE CENTER
// ------------------------------------------------------------
// Schema and category taxonomy come directly from the design
// mock (docs/design/Knowledge-Center.md) and the architecture
// analysis (docs/lot2-analysis.md §7.2) — not invented here.
// ============================================================

entity Topics : cuid {
  name          : String(100) @assert.unique;   // 'SAP BTP'
  description   : String(500);
  department    : String(100);
  articleCount  : Integer default 0;            // denormalised, like Lot 1's Rooms.followersCount
  questionCount : Integer default 0;
}

entity KnowledgeItems : cuid, managed {
  title           : String(300) @mandatory;

  /** The mock's 8 categories (docs/design/Knowledge-Center.md):
      Articles, Documentation, Rapports, Tutoriels, Bonnes pratiques,
      Questions résolues, FAQ, Modèles. */
  category        : String(30) enum {
    article; documentation; report; tutorial;
    best_practice; resolved_question; faq; template
  };

  excerpt         : String(500);
  content         : LargeString;
  topic           : Association to Topics;

  /** Business status (draft -> pending -> approved/rejected), enforced
      by srv/domain/KnowledgeWorkflow.js. Deliberately NOT CAP's
      @odata.draft.enabled — that is Lot 1's Posts editing-draft
      mechanism and answers a different question (lot2-analysis §1.4 R9). */
  status          : String(20) enum { draft; pending; approved; rejected } default 'draft';

  /** Spec §4.2/§4.6, decision C5. Enforced in @restrict below AND in
      every future search provider — never trust one enforcement point. */
  confidentiality : String(20) enum { public; internal; confidential } default 'internal';

  publishedAt     : Timestamp;
  viewCount       : Integer64 default 0;

  /** Set together when promoteQuestion() creates this row from a
      solved Question (Lot 3, not built yet - TODO-INTEGRATION.md I-07).
      fromQuestion drives the mock's checkmark icon; sourceQuestionID is
      deliberately not a real association for the same reason
      Notifications.sourceId isn't: the source may not exist yet. */
  fromQuestion    : Boolean default false;
  sourceQuestionID: UUID;

  tags            : Composition of many KnowledgeItemTags   on tags.item = $self;
  contributors    : Composition of many KnowledgeContributors on contributors.item = $self;
  attachments     : Composition of many KnowledgeAttachments on attachments.item = $self;
  relatedItems    : Composition of many KnowledgeRelations   on relatedItems.item = $self;

  /** Reverse side of `extend Comments with { knowledgeItem }` below -
      without this, the detail page has no way to navigate item -> comments. */
  comments        : Association to many Comments on comments.knowledgeItem = $self;
}

entity KnowledgeItemTags : cuid {
  item : Association to KnowledgeItems;
  tag  : Association to Tags;   // reuse Lot 1's Tags - never duplicate
}

/** Multiple contributors per item (the mock shows this explicitly,
    e.g. two names on the promoted-question item) - a composition,
    never a single `author` association like Lot 1's Posts. */
entity KnowledgeContributors : cuid {
  item : Association to KnowledgeItems;
  user : Association to UserProfiles;
  role : String(20) enum { author; contributor; reviewer } default 'author';
}

/** Metadata + a URL only - the binary itself is never stored in HANA.
    Same choice Lot 1 already made for PostDocuments; stay consistent. */
entity KnowledgeAttachments : cuid, managed {
  item     : Association to KnowledgeItems;
  fileName : String(255);
  fileUrl  : String(1000);
  fileType : String(50);
  fileSize : Integer;
}

/** The mock's "Documents liés" sidebar - a curated many-to-many,
    not a computed "similar items" list. */
entity KnowledgeRelations : cuid {
  item        : Association to KnowledgeItems;
  relatedItem : Association to KnowledgeItems;
  relationType: String(20) enum { related; supersedes; prerequisite } default 'related';
}

/** Contract B (lot2-analysis.md §3.3): one comment thread, one UI,
    one notification path - not a second KnowledgeComments entity.
    `post` stays optional; exactly one of post/knowledgeItem must be
    set, enforced in the domain layer, not here. */
extend Comments with {
  knowledgeItem : Association to KnowledgeItems;
}
