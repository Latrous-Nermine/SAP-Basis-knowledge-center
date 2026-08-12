sap.ui.define([
  "sap/ui/core/mvc/Controller"
], function(Controller) {
  "use strict";

  return Controller.extend("aymax.hub.controller.BaseController", {

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

    // Shared fallback for every migrated module: browser history first,
    // else back to Feed - the same behaviour 5 of the 6 original
    // per-module BaseControllers already used (Knowledge's own version
    // fell back to its own list route instead; that's normalised away
    // once Knowledge migrates, per the disclosed plan).
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
