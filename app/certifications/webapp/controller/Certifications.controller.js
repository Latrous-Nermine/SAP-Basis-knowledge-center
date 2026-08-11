sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(Controller, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("aymax.certifications.controller.Certifications", {

    onInit: function() {
      this.oViewModel = this.getOwnerComponent().getModel("view");
    },

    onNavToApp: function(oEvent) {
      var oItem = oEvent.getSource ? oEvent.getSource() : oEvent.getParameter("item");
      var sTarget = oItem.data("targetApp");
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


    /* ================= ACTIONS ================= */

    onStartCertification: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      if (!oContext) return;
      var sName = oContext.getProperty("certification/name") || "la certification";

      // Mettre à jour le statut via OData
      oContext.setProperty("status", "inProgress");
      oContext.setProperty("startDate", new Date().toISOString().split('T')[0]);
      oContext.setProperty("progress", 0);
      
      var oModel = this.getView().getModel();
      if (oModel && oModel.hasPendingChanges()) {
        oModel.submitBatch("$auto");
      }

      MessageToast.show("Certification " + sName + " démarrée !");
    },

    onViewCertificate: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      var sName = oContext ? oContext.getProperty("certification/name") : "";
      MessageToast.show("Ouverture du certificat : " + sName);
    },

    onContinueCertification: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      var sName = oContext ? oContext.getProperty("certification/name") : "";
      MessageToast.show("Reprise de la formation : " + sName);
    },

    /* ──────── FORMATTERS ──────── */

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
  });
});
