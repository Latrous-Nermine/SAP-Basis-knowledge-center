sap.ui.define([], function() {
  "use strict";

  return {
    // The view binding needs targetType:'any' for this to actually see a
    // number - without it, the OData model's own Int32 type formats
    // `points` into a display string ("5,000", comma-grouped) before this
    // formatter ever runs, and toLocaleString("fr-FR") on a STRING falls
    // through to Object.prototype's version, which ignores the locale
    // and returns the string unchanged - so this was silently showing
    // "5,000 pts" instead of the intended "5 000 pts" (confirmed live).
    formatPointsLabel: function(iPoints) {
      if (!iPoints && iPoints !== 0) return "";
      return iPoints.toLocaleString("fr-FR") + " pts";
    },

    formatRewardIcon: function(sIcon) {
      return sIcon || "sap-icon://gift";
    },

    // The catalog used to be a static list with no relationship to the
    // reputation it's presumably rewarding - nothing ever told a viewer
    // whether they qualified for anything. Read-only comparison against
    // the viewer's own reputation; no redemption/claim action invented.
    // Hardcoded French text, not an i18n lookup - a formatter function
    // is called as a plain method (obj.method()), so `this` here is
    // this formatter module, not the controller getResourceBundle()
    // lives on; same reasoning formatPointsLabel above already follows
    // for its own "pts" suffix.
    qualificationLabel: function(iPoints, iMyReputation) {
      if (iMyReputation === undefined || iMyReputation === null) return "";
      var iMissing = iPoints - iMyReputation;
      return iMissing <= 0
        ? "Vous y êtes !"
        : "Encore " + iMissing.toLocaleString("fr-FR") + " pts";
    },

    qualificationState: function(iPoints, iMyReputation) {
      if (iMyReputation === undefined || iMyReputation === null) return "None";
      return iPoints <= iMyReputation ? "Success" : "None";
    }
  };
});
