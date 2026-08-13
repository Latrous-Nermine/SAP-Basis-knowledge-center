sap.ui.define([], function() {
  "use strict";

  return {
    formatProgressPercent: function(iProgress) {
      return iProgress + "%";
    },

    formatProgressState: function(iProgress) {
      if (iProgress >= 70) return "Success";
      if (iProgress >= 40) return "Warning";
      return "Information";
    },

    formatRecommendedInfo: function(iArticles, iQuestions) {
      return "Articles recommandés : " + iArticles + " · Questions liées : " + iQuestions;
    }
  };
});
