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


    /* ──────── ACTIONS ──────── */

    onStartCertification: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("view");
      var sName = oContext.getProperty("name");

      // Move from recommended to inProgress
      var aRecommended = this.oViewModel.getProperty("/recommended");
      var aInProgress = this.oViewModel.getProperty("/inProgress");
      var iIndex = aRecommended.findIndex(function(c) { return c.name === sName; });

      if (iIndex > -1) {
        var oCert = Object.assign({}, aRecommended[iIndex], {
          startDate: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
          progress: 0,
          provider: "SAP Learning"
        });
        aInProgress.push(oCert);
        aRecommended.splice(iIndex, 1);

        this.oViewModel.setProperty("/inProgress", aInProgress);
        this.oViewModel.setProperty("/recommended", aRecommended);

        MessageToast.show("Certification « " + sName + " » démarrée !");
      }
    },

    onViewCertificate: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("view");
      var sName = oContext.getProperty("name");
      MessageToast.show("Ouverture du certificat : " + sName);
    },

    onContinueCertification: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("view");
      var sName = oContext.getProperty("name");
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
