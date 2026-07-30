sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function(UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("aymax.depot.Component", {
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
        files: [
          { name: "Cahier_des_charges_v2.pdf", size: "2.4 MB", type: "pdf", date: "Aujourd'hui, 10:23" },
          { name: "Maquettes_UI.zip", size: "14.1 MB", type: "zip", date: "Aujourd'hui, 09:15" },
          { name: "Architecture_Technique.docx", size: "1.1 MB", type: "doc", date: "Hier, 16:45" }
        ]
      });
      this.setModel(oViewModel, "view");
    }
  });
});
