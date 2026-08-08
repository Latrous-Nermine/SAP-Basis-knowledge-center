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

      var oViewModel = new JSONModel({
        rewards: [
          {
            name: "Sac pour ordinateur portable",
            points: 5000,
            category: "Accessoires",
            icon: "sap-icon://laptop"
          },
          {
            name: "Ordinateur portable",
            points: 10000,
            category: "Matériel",
            icon: "sap-icon://laptop"
          },
          {
            name: "Smartphone",
            points: 20000,
            category: "Matériel",
            icon: "sap-icon://iphone-2"
          },
          {
            name: "Chèque cadeau Amazon",
            points: 3000,
            category: "Bons d'achat",
            icon: "sap-icon://receipt"
          },
          {
            name: "Abonnement LinkedIn Learning",
            points: 2500,
            category: "Formation",
            icon: "sap-icon://learning-assistant"
          },
          {
            name: "Journée de congé supplémentaire",
            points: 8000,
            category: "Avantages RH",
            icon: "sap-icon://calendar"
          }
        ]
      });
      this.setModel(oViewModel, "view");
    }
  });
});
