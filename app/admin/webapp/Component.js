sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function(UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("aymax.admin.Component", {
    metadata: {
      manifest: "json"
    },

    init: function() {
      UIComponent.prototype.init.apply(this, arguments);

      // Initialize the router
      if (this.getRouter()) {
        this.getRouter().initialize();
      }

      var oViewModel = new JSONModel({
        activeTab: "roles"
      });
      this.setModel(oViewModel, "view");
    }
  });
});
