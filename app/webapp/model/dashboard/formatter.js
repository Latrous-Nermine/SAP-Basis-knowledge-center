sap.ui.define([
  "sap/ui/core/format/DateFormat"
], function(DateFormat) {
  "use strict";

  var oResourceBundle = null;

  // Same token set and hash as Profile/Experts - identical avatar colour
  // for the same user everywhere in the app.
  var AVATAR_COLOR_TOKENS = [
    "Accent1", "Accent2", "Accent3", "Accent4", "Accent5",
    "Accent6", "Accent7", "Accent8", "Accent9", "Accent10"
  ];

  function initials(sDisplayName) {
    if (!sDisplayName) return "?";
    var aParts = sDisplayName.trim().split(/\s+/);
    var sFirst = aParts[0] ? aParts[0].charAt(0) : "";
    var sSecond = aParts.length > 1 ? aParts[1].charAt(0) : "";
    return (sFirst + sSecond).toUpperCase();
  }

  function avatarColorFromID(sUserID) {
    if (!sUserID) return "Accent6";
    var iHash = 0;
    for (var i = 0; i < sUserID.length; i++) {
      iHash = (iHash * 31 + sUserID.charCodeAt(i)) >>> 0;
    }
    return AVATAR_COLOR_TOKENS[iHash % AVATAR_COLOR_TOKENS.length];
  }

  function relativeDateTime(vDate) {
    if (!vDate) return "";
    var oFormatter = DateFormat.getDateTimeInstance({ relative: true });
    return oFormatter.format(new Date(vDate));
  }

  // NotificationType enum values (db/lot2.cds) -> icon. Presentation only -
  // the Notifications widget itself stays type="Inactive" (no per-item
  // destination exists), this just gives each entry a distinct glyph
  // instead of the same bell for everything.
  var NOTIFICATION_ICONS = {
    COMMENT: "sap-icon://comment",
    MENTION: "sap-icon://person-placeholder",
    ANSWER_ACCEPTED: "sap-icon://accept",
    ARTICLE_PUBLISHED: "sap-icon://document-text",
    DOC_PUBLISHED: "sap-icon://document-text",
    ROOM_POST: "sap-icon://discussion-2",
    BADGE_EARNED: "sap-icon://favorite",
    CERTIFICATION_COMPLETED: "sap-icon://certificate",
    RECOMMENDATION: "sap-icon://lightbulb",
    VALIDATION_REQUESTED: "sap-icon://request",
    VALIDATION_RESULT: "sap-icon://approvals",
    UPDATE_REMINDER: "sap-icon://reminder",
    SECURITY_EVENT: "sap-icon://shield"
  };

  function notificationIcon(sType) {
    return NOTIFICATION_ICONS[sType] || "sap-icon://bell";
  }

  return {

    setResourceBundle: function(oBundle) {
      oResourceBundle = oBundle;
    },

    initials: initials,
    avatarColorFromID: avatarColorFromID,
    relativeDateTime: relativeDateTime,
    notificationIcon: notificationIcon,

    plusPoints: function(iPoints) {
      return "+" + iPoints;
    },

    membersLabel: function(iCount) {
      if (!oResourceBundle) return "";
      return oResourceBundle.getText("membersCount", [iCount || 0]);
    },

    certsEarnedLabel: function(iCount) {
      if (!oResourceBundle) return "";
      return oResourceBundle.getText("certsEarnedLabel", [iCount || 0]);
    },

    certsInProgressLabel: function(iCount) {
      if (!oResourceBundle) return "";
      return oResourceBundle.getText("certsInProgressLabel", [iCount || 0]);
    },

    certsRecommendedLabel: function(iCount) {
      if (!oResourceBundle) return "";
      return oResourceBundle.getText("certsRecommendedLabel", [iCount || 0]);
    },

    pointsLabel: function(iPoints) {
      if (!oResourceBundle) return "";
      return oResourceBundle.getText("pointsLabel", [iPoints || 0]);
    }
  };
});
