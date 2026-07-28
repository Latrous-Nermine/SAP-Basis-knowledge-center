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
 *    [x] Notifications          <- current step
 *    [ ] ActivityEvents + ReputationRules + Levels
 *    [ ] Skills / UserSkills
 *    [ ] Badges / UserBadges
 *    [ ] Favorites / RelatedContent / SearchLog
 * ============================================================
 */

namespace aymax.knowledgehub;

using { cuid } from '@sap/cds/common';
using { aymax.knowledgehub.UserProfiles } from './schema';


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
