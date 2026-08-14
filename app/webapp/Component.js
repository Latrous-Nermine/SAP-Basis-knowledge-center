sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel",
  "./model/devRole"
], function(UIComponent, JSONModel, devRole) {
  "use strict";

  return UIComponent.extend("aymax.hub.Component", {
    metadata: {
      manifest: "json"
    },

    init: function() {
      UIComponent.prototype.init.apply(this, arguments);

      var oViewModel = new JSONModel({
        busy: false
      });
      this.setModel(oViewModel, "view");

      // Dev-only role preview (CLAUDE.md §5 C7) - applied before the
      // router starts, so the very first navigation's data already
      // comes back under the previewed role, not the real login.
      devRole.applyToComponent(this, devRole.getStoredRole());

      this.getRouter().initialize();
    }
  });
});
