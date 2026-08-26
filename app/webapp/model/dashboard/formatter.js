sap.ui.define([
  "sap/ui/core/format/DateFormat",
  "../shared/notificationIcons",
  "../shared/avatarSrc"
], function(DateFormat, notificationIcons, avatarSrcUtil) {
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
  // instead of the same bell for everything. Shared with the Notifications
  // page's own formatter (model/shared/notificationIcons.js, 2026-08
  // unification pass) - was a second, disagreeing copy of this map before.
  function notificationIcon(sType) {
    return notificationIcons.getIcon(sType);
  }

  return {

    setResourceBundle: function(oBundle) {
      oResourceBundle = oBundle;
    },

    initials: initials,
    avatarColorFromID: avatarColorFromID,
    avatarSrc: avatarSrcUtil.avatarSrc,
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
    },

    skillBarLabel: function(iHeadcount, iPercent) {
      if (!oResourceBundle) return "";
      return oResourceBundle.getText("skillBarLabel", [iHeadcount || 0, iPercent || 0]);
    },

    // Replaces NumericHeader's own number+unitOfMeasurement composition,
    // now that KPI tiles render their value as a plain Text (see
    // Dashboard.view.xml's KPI card) - "value unit" for numeric KPIs
    // (unit is "" for Manager/HR/Admin, "pts" for Employee), or just the
    // value as-is for text KPIs (isText, e.g. a contributor's name).
    kpiValueText: function(vValue, sUnit) {
      if (vValue === undefined || vValue === null) return "";
      return sUnit ? vValue + " " + sUnit : String(vValue);
    }
  };
});
