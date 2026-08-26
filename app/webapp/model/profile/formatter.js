sap.ui.define([
  "sap/ui/core/format/DateFormat"
], function(DateFormat) {
  "use strict";

  // Fallback only now (2026-08: real upload added, see avatarSrc/
  // coverPhotoSrc below) - initials + a deterministic sap.m.AvatarColor
  // token, shown whenever a user hasn't uploaded a real photo. Using the
  // framework's own accent set means this never violates the "never hex"
  // rule and needs no custom CSS.
  var AVATAR_COLOR_TOKENS = [
    "Accent1", "Accent2", "Accent3", "Accent4", "Accent5",
    "Accent6", "Accent7", "Accent8", "Accent9", "Accent10"
  ];

  var ROLE_KEYS = {
    Employee: "role.employee",
    Manager: "role.departmentManager",
    HR: "role.hr",
    Administrator: "role.admin",
    Intern: "role.intern"
  };

  // Same three states as the Experts module's formatter (app/webapp/model/
  // experts/formatter.js) - kept in sync by hand since no shared library
  // exists yet (docs/lot2-analysis.md §6.3, still open).
  var AVAILABILITY_META = {
    available:   { key: "availability.available",   state: "Success" },
    busy:        { key: "availability.busy",         state: "Warning" },
    unavailable: { key: "availability.unavailable",   state: "Error" }
  };

  var oResourceBundle = null;

  function relativeDateTime(vDate) {
    if (!vDate) return "";
    var oFormatter = DateFormat.getDateTimeInstance({ relative: true });
    return oFormatter.format(new Date(vDate));
  }

  function absoluteDate(vDate) {
    if (!vDate) return "";
    var oFormatter = DateFormat.getDateInstance({ style: "long" });
    return oFormatter.format(new Date(vDate));
  }

  // First + second word (design reference: "Sami Ben Youssef" -> "SB", not
  // first+last - "Sami Ben Youssef" would otherwise give "SY").
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

  // sap.m.Avatar/Image only fall back to initials/placeholder when `src` is
  // genuinely empty - so this returns "" whenever no image has ever been
  // uploaded (mimeType null), not a broken/guessed URL. `iVersion` is a
  // plain counter bumped by the controller after a successful upload - the
  // media stream lives at a fixed URL per user, so without a change to the
  // URL itself the browser's own image cache would keep showing the old
  // picture after a re-upload.
  function profileImageSrc(sUserID, sMimeType, sProperty, iVersion) {
    if (!sUserID || !sMimeType) return "";
    return "/odata/v4/people/People('" + encodeURIComponent(sUserID) + "')/" + sProperty + "?v=" + (iVersion || 0);
  }

  function avatarSrc(sUserID, sMimeType, iVersion) {
    return profileImageSrc(sUserID, sMimeType, "avatar", iVersion);
  }

  function coverPhotoSrc(sUserID, sMimeType, iVersion) {
    return profileImageSrc(sUserID, sMimeType, "coverPhoto", iVersion);
  }

  return {

    setResourceBundle: function(oBundle) {
      oResourceBundle = oBundle;
    },

    initials: initials,
    avatarColorFromID: avatarColorFromID,
    avatarSrc: avatarSrc,
    coverPhotoSrc: coverPhotoSrc,
    relativeDateTime: relativeDateTime,

    roleLabel: function(sRole) {
      if (!sRole || !oResourceBundle) return "";
      var sKey = ROLE_KEYS[sRole];
      return sKey ? oResourceBundle.getText(sKey) : sRole;
    },

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

    // getActivity() (srv/people-service.js) returns plain {text, occurredAt}
    // rows assembled from several entities with no type discriminator - the
    // icon is inferred from the fixed French verb prefix each source uses.
    activityIcon: function(sText) {
      if (!sText) return "sap-icon://activity-items";
      if (sText.indexOf("A publié") === 0) return "sap-icon://document-text";
      if (sText.indexOf("A commenté") === 0) return "sap-icon://comment";
      if (sText.indexOf("A déposé") === 0) return "sap-icon://attachment";
      if (sText.indexOf("A suivi") === 0) return "sap-icon://person-placeholder";
      return "sap-icon://activity-items";
    },

    badgeProgressPercent: function(iBadgePoints, iBadgeGoal) {
      if (!iBadgeGoal) return 0;
      return Math.min(100, Math.round(((iBadgePoints || 0) / iBadgeGoal) * 100));
    },

    // Inline expression bindings for anything beyond simple negation proved
    // unreliable earlier in this project - a plain formatter avoids that class
    // of bug entirely.
    plusPoints: function(iPoints) {
      return "+" + iPoints;
    },

    starRating: function(iLevel) {
      var iStars = Math.max(0, Math.min(5, iLevel || 0));
      return "★".repeat(iStars) + "☆".repeat(5 - iStars);
    },

    postMetaLine: function(vCreatedAt, iLikeCount) {
      if (!oResourceBundle) return "";
      return oResourceBundle.getText("postMetaLine", [relativeDateTime(vCreatedAt), iLikeCount || 0]);
    },

    certProviderLabel: function(sProvider) {
      if (!sProvider || !oResourceBundle) return "";
      return oResourceBundle.getText("certProvider", [sProvider]);
    },

    certEarnedOnLabel: function(vEarnedDate) {
      if (!vEarnedDate || !oResourceBundle) return "";
      return oResourceBundle.getText("certEarnedOn", [absoluteDate(vEarnedDate)]);
    },

    certStartedOnLabel: function(vStartDate) {
      if (!vStartDate || !oResourceBundle) return "";
      return oResourceBundle.getText("certStartedOn", [absoluteDate(vStartDate)]);
    }
  };
});
