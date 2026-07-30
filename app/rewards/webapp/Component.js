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

      var oViewModel = new JSONModel({
        rewards: [
          { name: 'Sac pour ordinateur portable', points: 5000 },
          { name: 'Ordinateur portable', points: 10000 },
          { name: 'Smartphone', points: 20000 }
        ]
      });
      this.setModel(oViewModel, "view");
    }
  });
});
