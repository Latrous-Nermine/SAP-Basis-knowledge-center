sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function(Controller, MessageToast) {
  "use strict";

  return Controller.extend("aymax.rapports.controller.Rapports", {

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


    onSaveDraft: function() {
      var sTitle = this.oViewModel.getProperty("/draftTitle");
      if (!sTitle || sTitle.trim() === "") {
        MessageToast.show("Le titre du rapport est requis.");
        return;
      }

      var aHistory = this.oViewModel.getProperty("/history") || [];
      aHistory.unshift({ text: "Brouillon enregistré", time: "à l'instant" });

      this.oViewModel.setProperty("/status", "draft");
      this.oViewModel.setProperty("/history", aHistory);
      
      MessageToast.show("Brouillon sauvegardé avec succès.");
    },

    onSubmitReport: function() {
      var sTitle = this.oViewModel.getProperty("/draftTitle");
      if (!sTitle || sTitle.trim() === "") {
        MessageToast.show("Le titre du rapport est requis pour soumettre.");
        return;
      }

      var aHistory = this.oViewModel.getProperty("/history") || [];
      aHistory.unshift({ text: "Soumis à votre tuteur", time: "à l'instant" });

      this.oViewModel.setProperty("/status", "submitted");
      this.oViewModel.setProperty("/history", aHistory);

      MessageToast.show("Votre rapport a été soumis !");
    },

    /* --- Formatters --- */
    
    formatStatusText: function(sStatus) {
      var mMap = {
        "draft": "Brouillon",
        "submitted": "Soumis",
        "validated": "Validé"
      };
      return mMap[sStatus] || sStatus;
    },

    formatStatusState: function(sStatus) {
      var mMap = {
        "draft": "None",
        "submitted": "Warning",
        "validated": "Success"
      };
      return mMap[sStatus] || "None";
    }
  });
});
