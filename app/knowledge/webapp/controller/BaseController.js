sap.ui.define([
  "sap/ui/core/mvc/Controller"
], function(Controller) {
  "use strict";

  return Controller.extend("aymax.knowledge.controller.BaseController", {

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

    onNavBack: function() {
      var oHistory = sap.ui.core.routing.History.getInstance();
      if (oHistory.getPreviousHash() !== undefined) {
        window.history.go(-1);
      } else {
        this.getRouter().navTo("list", {}, true);
      }
    }
  });
});
