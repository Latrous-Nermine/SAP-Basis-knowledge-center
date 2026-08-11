sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function(UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("aymax.validation.Component", {
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
        filterStatus: "pending",
        counts: {
          pending: 3,
          approved: 1,
          rejected: 1,
          all: 5
        }
      });
      this.setModel(oViewModel, "view");
    }
  });
});
