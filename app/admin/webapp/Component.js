sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function(UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("aymax.admin.Component", {
    metadata: {
      manifest: "json"
    },

    init: function() {
      UIComponent.prototype.init.apply(this, arguments);

      var oViewModel = new JSONModel({
        activeTab: "roles",
        roles: [
          { name: 'Administrateur', desc: 'Gestion technique de la plateforme', count: 2 },
          { name: 'Manager', desc: 'Vue globale, validation du contenu', count: 8 },
          { name: 'RH', desc: 'Analytique employés et récompenses', count: 3 },
          { name: 'Employé', desc: 'Accès standard', count: 142 },
          { name: 'Stagiaire', desc: 'Accès restreint', count: 14 }
        ],
        permissions: [
          { name: 'Publier un article', admin: '—', manager: '✓', hr: '—', employee: '✓', intern: '—' },
          { name: 'Valider le contenu', admin: '—', manager: '✓', hr: '—', employee: '—', intern: '—' },
          { name: 'Voter (upvote/downvote)', admin: '—', manager: '✓', hr: '—', employee: '✓', intern: '—' },
          { name: 'Gérer les récompenses', admin: '—', manager: '—', hr: '✓', employee: '—', intern: '—' },
          { name: 'Gérer les rôles', admin: '✓', manager: '—', hr: '—', employee: '—', intern: '—' },
          { name: 'Créer une question', admin: '—', manager: '✓', hr: '—', employee: '✓', intern: '✓' }
        ]
      });
      this.setModel(oViewModel, "view");
    }
  });
});
