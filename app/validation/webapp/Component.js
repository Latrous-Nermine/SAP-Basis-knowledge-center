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

      var aItems = [
        { id: 1, title: 'Guide de paramétrage des vues CDS pour la migration HANA Cloud', category: 'Documentation', author: 'Nadia Ferchichi', dept: 'Solutions SAP', time: 'il y a 2 h', excerpt: 'Pièges à éviter et check-list de paramétrage rassemblés après le retour d\'expérience de la migration HANA Cloud.', status: 'pending' },
        { id: 2, title: 'Réduire le poids des images Docker de build en pipeline CI/CD', category: 'Bonnes pratiques', author: 'Karim Trabelsi', dept: 'Développement Digital', time: 'il y a 5 h', excerpt: 'Retour d\'expérience sur l\'optimisation multi-stage et le nettoyage des couches intermédiaires.', status: 'pending' },
        { id: 3, title: 'Rapport de fin de stage — intégration API Portail Client', category: 'Rapport de stage', author: 'Yassine Gharbi', dept: 'Gestion des données', time: 'hier', excerpt: 'Synthèse des travaux réalisés durant le stage sur l\'intégration des flux de données.', status: 'pending' },
        { id: 4, title: 'Gabarit Fiori Elements — liste analytique + carte de synthèse', category: 'Modèles', author: 'Ines Chaabane', dept: 'Solutions SAP', time: 'il y a 2 jours', excerpt: 'Modèle prêt à l\'emploi pour accélérer les écrans de reporting finance et logistique.', status: 'approved' },
        { id: 5, title: 'Comparatif interne des frameworks front (brouillon incomplet)', category: 'Article', author: 'Sami Ben Youssef', dept: 'Solutions SAP', time: 'il y a 4 jours', excerpt: 'Ébauche non aboutie, manque de sources et de structure.', status: 'rejected' }
      ];

      var oViewModel = new JSONModel({
        filterStatus: "pending",
        allItems: aItems,
        displayItems: aItems.filter(function(i) { return i.status === "pending"; }),
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
