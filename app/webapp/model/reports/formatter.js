sap.ui.define([], function() {
  "use strict";

  var oResourceBundle = null;

  return {

    setResourceBundle: function(oBundle) {
      oResourceBundle = oBundle;
    },

    formatKpiIcon: function(sState) {
      if (sState === "Success") return "sap-icon://trend-up";
      if (sState === "Warning") return "sap-icon://alert";
      if (sState === "Error") return "sap-icon://trend-down";
      return "sap-icon://information";
    },

    formatKpiColor: function(sState) {
      if (sState === "Success") return "#16a34a";
      if (sState === "Warning") return "#d97706";
      if (sState === "Error") return "#dc2626";
      return "#4274D9";
    },

    formatDeptInitials: function(sDept) {
      if (!sDept) return "?";
      var aWords = sDept.split(" ");
      if (aWords.length >= 2) return (aWords[0][0] + aWords[1][0]).toUpperCase();
      return sDept.substring(0, 2).toUpperCase();
    },

    formatTrend: function(iAvgRep) {
      if (!oResourceBundle) return "";
      if (iAvgRep >= 1500) return oResourceBundle.getText("trendExcellent");
      if (iAvgRep >= 1000) return oResourceBundle.getText("trendGood");
      return oResourceBundle.getText("trendToImprove");
    },

    formatTrendState: function(iAvgRep) {
      if (iAvgRep >= 1500) return "Success";
      if (iAvgRep >= 1000) return "Information";
      return "Warning";
    }
  };
});
