sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function(UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("aymax.certifications.Component", {
    metadata: {
      manifest: "json"
    },

    init: function() {
      UIComponent.prototype.init.apply(this, arguments);

      // 1. Initialiser le router
      if (this.getRouter()) {
        this.getRouter().initialize();
      }

      // ── View Model (mock data for UI-only mode) ──
      var oViewModel = new JSONModel({
        busy: false
      });
      this.setModel(oViewModel, "view");
    }
  });
});
