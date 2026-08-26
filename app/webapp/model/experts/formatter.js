sap.ui.define([
  "../shared/avatarSrc"
], function(avatarSrcUtil) {
  "use strict";

  // Same token set and hash as Profile's formatter - same user ID resolves
  // to the same avatar colour on both pages.
  var AVATAR_COLOR_TOKENS = [
    "Accent1", "Accent2", "Accent3", "Accent4", "Accent5",
    "Accent6", "Accent7", "Accent8", "Accent9", "Accent10"
  ];

  var AVAILABILITY_META = {
    available:   { key: "availability.available",   state: "Success" },
    busy:        { key: "availability.busy",         state: "Warning" },
    unavailable: { key: "availability.unavailable",   state: "Error" }
  };

  var oResourceBundle = null;

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

  return {

    setResourceBundle: function(oBundle) {
      oResourceBundle = oBundle;
    },

    avatarSrc: avatarSrcUtil.avatarSrc,

    initials: initials,
    avatarColorFromID: avatarColorFromID,

    availabilityLabel: function(sAvailability) {
      if (!sAvailability || !oResourceBundle) return "";
      var oMeta = AVAILABILITY_META[sAvailability];
      return oMeta ? oResourceBundle.getText(oMeta.key) : sAvailability;
    },

    availabilityState: function(sAvailability) {
      var oMeta = AVAILABILITY_META[sAvailability];
      return oMeta ? oMeta.state : "None";
    },

    yearsOfExperienceLabel: function(iYears) {
      if (!oResourceBundle || iYears === null || iYears === undefined) return "";
      return oResourceBundle.getText("yearsOfExperience", [iYears]);
    },

    // Follow button - identical formulas to Profile's, reused here so a
    // card's Follow button and Profile's header Follow button never drift.
    followButtonText: function(bIsFollowedByMe) {
      if (!oResourceBundle) return "";
      return oResourceBundle.getText(bIsFollowedByMe ? "unfollow" : "follow");
    },

    followButtonType: function(bIsFollowedByMe) {
      return bIsFollowedByMe ? "Default" : "Emphasized";
    },

    followButtonIcon: function(bIsFollowedByMe) {
      return bIsFollowedByMe ? "sap-icon://less" : "sap-icon://add-employee";
    },

    // Hide a card's own Follow button on the viewer's own profile - same
    // isOwnProfile reasoning Profile already applies.
    isNotOwnProfile: function(sUserID, sCurrentUserID) {
      return !!sUserID && sUserID !== sCurrentUserID;
    },

    reputationLabel: function(iReputation) {
      if (!oResourceBundle) return "";
      return oResourceBundle.getText("reputationPoints", [iReputation || 0]);
    },

    contributionsLabel: function(iCount) {
      if (!oResourceBundle) return "";
      return oResourceBundle.getText("contributionsCount", [iCount || 0]);
    },

    departmentFilterButtonType: function(bActive) {
      return bActive ? "Emphasized" : "Default";
    }
  };
});
