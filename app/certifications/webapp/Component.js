sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function(UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("aymax.certifications.Component", {
    metadata: {
      manifest: "json"
    },

    init: function() {
      UIComponent.prototype.init.apply(this, arguments);

      // 1. Initialiser le router
      if (this.getRouter()) {
        this.getRouter().initialize();
      }

      // ── View Model (mock data for UI-only mode) ──
      var oViewModel = new JSONModel({
        busy: false,

        // ── Certifications Obtained ──
        earned: [
          {
            id: "c1",
            name: "SAP BTP Associate",
            description: "Fondamentaux de la plateforme cloud SAP BTP.",
            date: "Obtenue en mars 2026",
            provider: "SAP Learning",
            skills: ["SAP BTP", "Cloud Foundry"]
          },
          {
            id: "c2",
            name: "SAP Fiori Elements Developer",
            description: "Développement d'applications SAP Fiori Elements.",
            date: "Obtenue en janvier 2026",
            provider: "SAP Learning",
            skills: ["Fiori", "UI5", "OData"]
          }
        ],

        // ── Certifications In Progress ──
        inProgress: [
          {
            id: "c3",
            name: "Cloud Foundry Advanced",
            description: "Déploiement et exploitation avancée sur Cloud Foundry.",
            provider: "SAP Learning",
            startDate: "2 juin 2026",
            progress: 30,
            skills: ["Cloud Foundry", "CAP"]
          },
          {
            id: "c4",
            name: "SAP HANA Cloud Specialist",
            description: "Optimisation et migration vers SAP HANA Cloud.",
            provider: "SAP Learning",
            startDate: "14 avril 2026",
            progress: 65,
            skills: ["HANA", "Performance"]
          }
        ],

        // ── Recommended Certifications ──
        recommended: [
          {
            id: "c5",
            name: "Spring Boot Professional",
            description: "Certification avancée sur l'écosystème Spring Boot.",
            recArticles: 4,
            recQuestions: 6,
            skills: ["Java", "Spring Boot", "REST API"]
          },
          {
            id: "c6",
            name: "SAP Integration Suite",
            description: "Intégration de flux de données entre systèmes SAP et tiers.",
            recArticles: 3,
            recQuestions: 2,
            skills: ["Integration", "SAP BTP", "API Management"]
          }
        ]
      });
      this.setModel(oViewModel, "view");
    }
  });
});
