sap.ui.define([], function() {
  "use strict";

  return {
    formatPermIcon: function(bVal) {
      return bVal ? "sap-icon://accept" : "sap-icon://less";
    },

    formatPermColor: function(bVal) {
      return bVal ? "#16a34a" : "#b7c1d6";
    },

    formatRoleInitials: function(sName) {
      if (!sName) return "?";
      var words = sName.split(" ");
      if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
      return sName.substring(0, 2).toUpperCase();
    }
  };
});
