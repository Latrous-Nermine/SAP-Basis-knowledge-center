sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function(Controller, MessageToast) {
  "use strict";

  return Controller.extend("aymax.rapports.dash.controller.RapportsDash", {
    onInit: function() {
      // Controller ready — model initialized in Component.js
    },

    onNavToApp: function(oEvent) {
      var sTarget = oEvent.getSource().data("targetApp");
      if (!sTarget) return;

      if (sap.ushell && sap.ushell.Container) {
        sap.ushell.Container.getServiceAsync("CrossApplicationNavigation").then(function (oCrossAppNav) {
          oCrossAppNav.toExternal({
            target: { semanticObject: sTarget, action: "display" }
          });
        });
      } else {
        window.location.href = "/" + sTarget + "/webapp/index.html";
      }
    },

    onExport: function() {
      MessageToast.show("Export en cours... (simulation)");
    },

    /* ── Formatters ── */

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
      var words = sDept.split(" ");
      if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
      return sDept.substring(0, 2).toUpperCase();
    },

    formatTrend: function(iAvgRep) {
      if (iAvgRep >= 1500) return "Excellent";
      if (iAvgRep >= 1000) return "Bon";
      return "À améliorer";
    },

    formatTrendState: function(iAvgRep) {
      if (iAvgRep >= 1500) return "Success";
      if (iAvgRep >= 1000) return "Information";
      return "Warning";
    }
  });
});
