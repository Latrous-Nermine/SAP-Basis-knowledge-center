sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function(UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("aymax.rewards.Component", {
    metadata: {
      manifest: "json"
    },

    init: function() {
      UIComponent.prototype.init.apply(this, arguments);

      // 1. Initialiser le router
      if (this.getRouter()) {
        this.getRouter().initialize();
      }

      var oViewModel = new JSONModel({});
      this.setModel(oViewModel, "view");
    }
  });
});
