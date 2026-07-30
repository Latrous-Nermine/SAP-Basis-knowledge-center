sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function(Controller, MessageToast) {
  "use strict";

  return Controller.extend("aymax.admin.controller.Admin", {
    onInit: function() {
      this.oViewModel = this.getOwnerComponent().getModel("view");
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

    
    onTabSelect: function(oEvent) {
      var sKey = oEvent.getSource().data("key");
      this.oViewModel.setProperty("/activeTab", sKey);
    },
    
    onSaveSettings: function() {
      MessageToast.show("Paramètres enregistrés.");
    }
  });
});
