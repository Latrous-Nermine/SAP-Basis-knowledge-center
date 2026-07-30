sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function(Controller, MessageToast) {
  "use strict";

  return Controller.extend("aymax.rewards.controller.Rewards", {
    onInit: function() {
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

    
    onAddReward: function() {
      MessageToast.show("Ouverture du formulaire d'ajout (simulation)");
    },
    
    onEditReward: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("view");
      var sName = oContext.getProperty("name");
      MessageToast.show("Édition de : " + sName);
    },
    
    formatPointsLabel: function(iPoints) {
      return iPoints.toLocaleString("fr-FR") + " points";
    }
  });
});
