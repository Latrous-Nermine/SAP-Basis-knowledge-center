sap.ui.define([
  "../shared/avatarSrc"
], function(avatarSrcUtil) {
  "use strict";

  var OBJ_STATUS_META = {
    ontrack: { key: "statusOnTrack", state: "Success" },
    atrisk:  { key: "statusAtRisk",  state: "Warning" },
    done:    { key: "statusDone",    state: "Information" }
  };

  var oResourceBundle = null;

  // Same first+second-word rule as profile/experts/dashboard formatters -
  // HR's own Employees projection (UserProfiles) doesn't store initials,
  // same reasoning as everywhere else in this app.
  function initials(sDisplayName) {
    if (!sDisplayName) return "?";
    var aParts = sDisplayName.trim().split(/\s+/);
    var sFirst = aParts[0] ? aParts[0].charAt(0) : "";
    var sSecond = aParts.length > 1 ? aParts[1].charAt(0) : "";
    return (sFirst + sSecond).toUpperCase();
  }

  // Same ★/☆ rendering as profile/formatter.js#starRating, over
  // UserSkills.level (1..5) instead of Riadh's precomputed stars string.
  function starRating(iLevel) {
    var iStars = Math.max(0, Math.min(5, iLevel || 0));
    return "★".repeat(iStars) + "☆".repeat(5 - iStars);
  }

  return {

    setResourceBundle: function(oBundle) {
      oResourceBundle = oBundle;
    },

    initials: initials,
    starRating: starRating,
    avatarSrc: avatarSrcUtil.avatarSrc,

    formatObjStatusText: function(sStatus) {
      if (!oResourceBundle) return sStatus;
      var oMeta = OBJ_STATUS_META[sStatus];
      return oMeta ? oResourceBundle.getText(oMeta.key) : sStatus;
    },

    formatObjStatusState: function(sStatus) {
      var oMeta = OBJ_STATUS_META[sStatus];
      return oMeta ? oMeta.state : "None";
    },

    formatSkillWidth: function(iPercent) {
      return (iPercent || 0) + "%";
    },

    certsEarnedLabel: function(iCount) {
      if (!oResourceBundle) return "";
      return oResourceBundle.getText("certsEarned", [iCount || 0]);
    },

    certsInProgressLabel: function(iCount) {
      if (!oResourceBundle) return "";
      return oResourceBundle.getText("certsInProgress", [iCount || 0]);
    },

    skillGapMetaLabel: function(iPercent, iHeadcount) {
      if (!oResourceBundle) return "";
      return oResourceBundle.getText("skillGapMeta", [iPercent || 0, iHeadcount || 0]);
    },

    objectiveDueLabel: function(sOwner, sDue) {
      if (!oResourceBundle) return "";
      return oResourceBundle.getText("objectiveDue", [sOwner || "", sDue || ""]);
    }
  };
});
