sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function(Controller, MessageToast) {
  "use strict";

  return Controller.extend("aymax.rapports.controller.Rapports", {

    onInit: function() {
      this.oViewModel = this.getOwnerComponent().getModel("view");
      var oView = this.getView();
      
      // Auto-bind to first report for the prototype
      var oModel = this.getOwnerComponent().getModel();
      if(oModel) {
        var oListBinding = oModel.bindList("/Rapports");
        oListBinding.requestContexts(0, 1).then(function(aContexts) {
          if (aContexts && aContexts.length > 0) {
            oView.bindElement({
              path: aContexts[0].getPath(),
              parameters: { $expand: 'history' }
            });
          }
        });
      }
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
      MessageToast.show("Brouillon sauvegardé (Auto-save OData activé).");
    },

    onSubmitReport: function() {
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
