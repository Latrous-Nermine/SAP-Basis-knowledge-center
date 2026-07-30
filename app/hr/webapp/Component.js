sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function(UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("aymax.hr.Component", {
    metadata: {
      manifest: "json"
    },

    init: function() {
      UIComponent.prototype.init.apply(this, arguments);

      // ── View Model (mock data for UI-only mode) ──
      var oViewModel = new JSONModel({
        activeTab: "employes",
        activeEmployeeId: null,
        busy: false,

        // ── Employee list ──
        employees: [
          {
            id: "ef1", name: "Nadia Ferchichi", initials: "NF",
            dept: "Solutions SAP", level: "Expert", reputation: 2140,
            objStatus: "ontrack",
            objectiveTitle: "Certifier 3 consultants SAP BTP Associate",
            certsEarnedCount: 2, certsProgressCount: 1,
            skills: [
              { name: "SAP HANA", stars: "★★★★★", percent: 96 },
              { name: "SAP BTP", stars: "★★★★★", percent: 92 },
              { name: "Business Intelligence", stars: "★★★★☆", percent: 80 }
            ]
          },
          {
            id: "ef2", name: "Karim Trabelsi", initials: "KT",
            dept: "Développement Digital", level: "Expert", reputation: 1875,
            objStatus: "ontrack",
            objectiveTitle: "Publier 5 bonnes pratiques CI/CD",
            certsEarnedCount: 1, certsProgressCount: 0,
            skills: [
              { name: "CAP", stars: "★★★★★", percent: 90 },
              { name: "Cloud Foundry", stars: "★★★★★", percent: 94 },
              { name: "Docker", stars: "★★★☆☆", percent: 62 }
            ]
          },
          {
            id: "ef3", name: "Ines Chaabane", initials: "IC",
            dept: "Solutions SAP", level: "Contributeur", reputation: 1520,
            objStatus: "atrisk",
            objectiveTitle: "Réduire le délai de résolution des questions à 24h",
            certsEarnedCount: 1, certsProgressCount: 1,
            skills: [
              { name: "SAP Fiori", stars: "★★★★★", percent: 95 },
              { name: "UX Design", stars: "★★★★★", percent: 90 },
              { name: "Angular", stars: "★★★☆☆", percent: 58 }
            ]
          },
          {
            id: "ef4", name: "Yassine Gharbi", initials: "YG",
            dept: "Gestion des données", level: "Contributeur", reputation: 980,
            objStatus: "ontrack",
            objectiveTitle: "Documenter les flux d'intégration inter-applicatifs",
            certsEarnedCount: 0, certsProgressCount: 1,
            skills: [
              { name: "Intégration de données", stars: "★★★★☆", percent: 78 },
              { name: "SAP BTP", stars: "★★★☆☆", percent: 60 }
            ]
          },
          {
            id: "ef5", name: "Sami Ben Youssef", initials: "SB",
            dept: "Solutions SAP", level: "Contributeur", reputation: 1200,
            objStatus: "ontrack",
            objectiveTitle: "Certifier 3 consultants SAP BTP Associate",
            certsEarnedCount: 2, certsProgressCount: 2,
            skills: [
              { name: "SAP BTP", stars: "★★★★★", percent: 92 },
              { name: "Java / Spring Boot", stars: "★★★★☆", percent: 80 },
              { name: "SAP Fiori", stars: "★★★★☆", percent: 78 }
            ]
          }
        ],

        // ── Skill gap analysis ──
        skillGaps: [
          { name: "SAP BTP", percent: 78, headcount: 12 },
          { name: "Java / Spring Boot", percent: 64, headcount: 9 },
          { name: "Cloud Foundry", percent: 52, headcount: 7 },
          { name: "Docker / CI-CD", percent: 41, headcount: 6 }
        ],

        // ── Objectives ──
        objectives: [
          { title: "Certifier 3 consultants SAP BTP Associate", owner: "Solutions SAP", due: "Sept. 2026", status: "ontrack" },
          { title: "Réduire le délai de résolution des questions à 24h", owner: "Tous départements", due: "Août 2026", status: "atrisk" },
          { title: "Publier 5 bonnes pratiques CI/CD", owner: "Développement Digital", due: "Juil. 2026", status: "done" }
        ]
      });
      this.setModel(oViewModel, "view");
    }
  });
});
