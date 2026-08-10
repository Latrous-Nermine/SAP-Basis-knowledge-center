sap.ui.define([
  "sap/ui/core/mvc/Controller"
], function(Controller) {
  "use strict";

  return Controller.extend("aymax.dashboard.controller.BaseController", {

    getRouter: function() {
      return this.getOwnerComponent().getRouter();
    },

    getResourceBundle: function() {
      return this.getOwnerComponent().getModel("i18n").getResourceBundle();
    },

    getText: function(sKey, aArgs) {
      return this.getResourceBundle().getText(sKey, aArgs);
    },

    getViewModel: function() {
      return this.getOwnerComponent().getModel("view");
    },

    // Single route ("") - same reasoning as Profile/Experts: browser
    // history first, otherwise back to the Feed shell.
    onNavBack: function() {
      var oHistory = sap.ui.core.routing.History.getInstance();
      if (oHistory.getPreviousHash() !== undefined) {
        window.history.go(-1);
      } else {
        window.location.href = "/feed/webapp/index.html";
      }
    }
  });
});
