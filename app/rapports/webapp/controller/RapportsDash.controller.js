sap.ui.define([
  "sap/ui/core/mvc/Controller"
], function(Controller) {
  "use strict";

  return Controller.extend("aymax.rapports.dash.controller.RapportsDash", {
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
    }
  });
});
