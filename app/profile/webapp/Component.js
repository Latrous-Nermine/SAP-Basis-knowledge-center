sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function(UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("aymax.profile.Component", {
    metadata: {
      manifest: "json"
    },

    init: function() {
      UIComponent.prototype.init.apply(this, arguments);

      var oViewModel = new JSONModel({
        busy: false,
        // Design constant (docs/design/Profile.md) - the target the Badges
        // KPI card's progress bar fills towards. Not per-user data.
        badgeGoal: 1000
      });
      this.setModel(oViewModel, "view");

      this.getRouter().initialize();
    }
  });
});
