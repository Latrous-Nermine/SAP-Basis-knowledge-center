sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel",
  "./model/devRole"
], function(UIComponent, JSONModel, devRole) {
  "use strict";

  return UIComponent.extend("aymax.feed.Component", {
    metadata: { manifest: "json" },

    init: function() {
      // 1. Appeler le parent (OBLIGATOIRE)
      UIComponent.prototype.init.apply(this, arguments);

      // 1bis. Dev-only role preview (CLAUDE.md §5 C7 exception) -
      // applied before the router starts, same ordering reasoning as
      // the shared shell's own Component.js: the very first navigation's
      // data has to already carry the previewed role, not the real login.
      devRole.applyToComponent(this);

      // 2. Initialiser le router
      this.getRouter().initialize();

      // 3. Forcer la navigation vers Feed si pas de hash
      var sHash = window.location.hash;
      if (!sHash || sHash === "#" || sHash === "") {
        this.getRouter().navTo("feed", {}, true);
      }

      // 4. Créer le modèle local (état UI)
      var oViewModel = new JSONModel({
        postText: "",
        selectedFilter: "all",
        busy: false,
        userRole: "Employé", // ← Sera mis à jour par XSUAA
        currentUser: {
          userID: "",
          displayName: "",
          jobTitle: "",
          department: "",
          reputation: 0,
          badgesCount: 0,
          avatarUrl: "",
          role: "Employee"
        }
      });
      this.setModel(oViewModel, "view");

      // 5. Charger le profil utilisateur depuis le backend
      this._loadCurrentUser();
    },

    _loadCurrentUser: function() {
      var oModel = this.getModel();
      var oViewModel = this.getModel("view");

      if (!oModel) {
        console.warn("OData model not ready yet");
        return;
      }

      var oContext = oModel.bindContext("/getCurrentUserProfile()");
      oContext.requestObject().then(function(oData) {
        if (oData) {
          oViewModel.setProperty("/currentUser", {
            userID: oData.userID || "",
            displayName: oData.displayName || "",
            jobTitle: oData.jobTitle || "",
            department: oData.department || "",
            reputation: oData.reputation || 0,
            badgesCount: oData.badgesCount || 0,
            avatarUrl: oData.avatarUrl || "",
            role: oData.role || "Employee"
          });
          // Mettre à jour le rôle affiché dans le header
          var mRoleLabels = {
            "Administrator": "Administrateur",
            "Manager": "Manager",
            "Employee": "Employé",
            "Intern": "Stagiaire",
            "HR": "RH"
          };
          oViewModel.setProperty("/userRole", mRoleLabels[oData.role] || oData.role || "Employé");
        }
      }).catch(function(oError) {
        console.error("Failed to load user profile", oError);
      });
    }
  });
});