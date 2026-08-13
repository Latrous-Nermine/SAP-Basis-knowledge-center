sap.ui.define([], function() {
  "use strict";

  return {
    formatPointsLabel: function(iPoints) {
      if (!iPoints && iPoints !== 0) return "";
      return iPoints.toLocaleString("fr-FR") + " pts";
    },

    formatRewardIcon: function(sIcon) {
      return sIcon || "sap-icon://gift";
    }
  };
});
