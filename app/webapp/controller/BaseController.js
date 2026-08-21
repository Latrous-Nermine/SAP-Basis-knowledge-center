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
    },

    // Fix (2026-08): every one of this shell's own controllers used to
    // call `oModel.bindContext(sPath)(mParameters)` to invoke an action
    // with input parameters - that throws a TypeError at runtime
    // (ODataContextBinding instances aren't callable; confirmed against
    // the actual UI5 1.120.0 sap/ui/model/odata/v4/ODataContextBinding
    // source, not assumed). Every action-with-parameters button across
    // Certifications/Knowledge Center/Notifications/Experts was affected -
    // none of them had ever actually been exercised through a real click,
    // only via their backend endpoint directly (curl). The correct,
    // working shape - deferred operation path ending in "(...)", then
    // setParameter() per argument - is exactly what app/feed/webapp's
    // own model/feed/ODataService.js#callAction already does correctly;
    // this is that same fix, centralised here instead of hand-rolled at
    // every call site (which is how the bug spread in the first place).
    // Returns the still-unexecuted operation binding - callers keep
    // their own .execute().then()/.catch() exactly as before.
    bindAction: function(oModel, sActionPath, mParameters) {
      var oOperation = oModel.bindContext(sActionPath + "(...)");
      if (mParameters) {
        Object.keys(mParameters).forEach(function(sKey) {
          oOperation.setParameter(sKey, mParameters[sKey]);
        });
      }
      return oOperation;
    }
  });
});
