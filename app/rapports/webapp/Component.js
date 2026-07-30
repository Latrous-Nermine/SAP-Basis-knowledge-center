sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function(UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("aymax.rapports.dash.Component", {
    metadata: {
      manifest: "json"
    },

    init: function() {
      UIComponent.prototype.init.apply(this, arguments);

      var oViewModel = new JSONModel({
        kpis: [
          { label: 'Publications ce mois', value: '86', delta: '+12% vs mois dernier', state: 'Success' },
          { label: 'Questions résolues', value: '41', delta: '+6% vs mois dernier', state: 'Success' },
          { label: 'Contenu validé', value: '23', delta: '4 en attente', state: 'Information' },
          { label: 'Réputation moyenne', value: '1 340', delta: '+80 pts vs mois dernier', state: 'Success' }
        ],
        deptRows: [
          { dept: 'Solutions SAP', pubs: 34, solved: 19, avgRep: 1620 },
          { dept: 'Développement Digital', pubs: 28, solved: 15, avgRep: 1480 },
          { dept: 'Gestion des données', pubs: 12, solved: 5, avgRep: 980 },
          { dept: 'RH', pubs: 6, solved: 2, avgRep: 720 }
        ]
      });
      this.setModel(oViewModel, "view");
    }
  });
});
