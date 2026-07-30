sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function(UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("aymax.rapports.Component", {
    metadata: {
      manifest: "json"
    },

    init: function() {
      UIComponent.prototype.init.apply(this, arguments);

      var oViewModel = new JSONModel({
        draftTitle: "Rapport de stage — Migration HANA Cloud",
        draftPeriod: "Juin – Août 2026",
        draftBody: "",
        status: "draft", // draft, submitted, validated
        history: [
          { text: "Brouillon enregistré", time: "il y a 1 h" },
          { text: "Soumis à Nadia Ferchichi (tutrice)", time: "il y a 3 semaines" }
        ]
      });
      this.setModel(oViewModel, "view");
    }
  });
});
