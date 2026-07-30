sap.ui.define([
  "sap/ui/core/mvc/Controller"
], function(Controller) {
  "use strict";

  return Controller.extend("aymax.notifications.controller.BaseController", {

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
      var sPreviousHash = oHistory.getPreviousHash();
      if (sPreviousHash !== undefined) {
        window.history.go(-1);
      }
    }
  });
});
