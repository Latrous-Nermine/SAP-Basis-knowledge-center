sap.ui.define([], function() {
  "use strict";

  // Single source of truth for NotificationType (db/lot2.cds) -> icon.
  // Was duplicated in notifications/formatter.js and dashboard/formatter.js
  // with different icons for the same type (MENTION, DOC_PUBLISHED,
  // BADGE_EARNED, VALIDATION_RESULT, SECURITY_EVENT all disagreed) - the
  // same event rendered with a different glyph depending on whether you
  // saw it on the Notifications page or the Dashboard activity feed
  // (2026-08 unification pass, real bug found in the audit).
  var ICONS = {
    COMMENT: "sap-icon://comment",
    MENTION: "sap-icon://discussion-2",
    ANSWER_ACCEPTED: "sap-icon://accept",
    ARTICLE_PUBLISHED: "sap-icon://document-text",
    DOC_PUBLISHED: "sap-icon://document",
    ROOM_POST: "sap-icon://group",
    BADGE_EARNED: "sap-icon://badge",
    CERTIFICATION_COMPLETED: "sap-icon://certificate",
    RECOMMENDATION: "sap-icon://lightbulb",
    VALIDATION_REQUESTED: "sap-icon://request",
    VALIDATION_RESULT: "sap-icon://complete",
    UPDATE_REMINDER: "sap-icon://reminder",
    SECURITY_EVENT: "sap-icon://alert"
  };

  return {
    getIcon: function(sType) {
      return ICONS[sType] || "sap-icon://bell";
    }
  };
});
