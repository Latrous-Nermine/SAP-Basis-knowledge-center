sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function(UIComponent, JSONModel) {
  "use strict";
  
  return UIComponent.extend("aymax.feed.Component", {
    metadata: {
      manifest: "json"
    },
    
    init: function() {
      UIComponent.prototype.init.apply(this, arguments);
      
      var oViewModel = new JSONModel({
        postText: "",
        selectedFilter: "all",
        busy: false,
        currentUser: {
          displayName: "",
          jobTitle: "",
          department: "",
          reputation: 0,
          badgesCount: 0,
          avatarUrl: ""
        }
      });
      this.setModel(oViewModel, "view");
      
      // Charger le profil utilisateur au démarrage
      this._loadCurrentUser();
    },
    
    _loadCurrentUser: function() {
      var oModel = this.getModel();
      var oViewModel = this.getModel("view");
      
      // OData V4 : bindContext sur la fonction
      var oContext = oModel.bindContext("/getCurrentUserProfile()");
      oContext.requestObject().then(function(oData) {
        if (oData) {
          oViewModel.setProperty("/currentUser", {
            displayName: oData.displayName || "",
            jobTitle: oData.jobTitle || "",
            department: oData.department || "",
            reputation: oData.reputation || 0,
            badgesCount: oData.badgesCount || 0,
            avatarUrl: oData.avatarUrl || ""
          });
        }
      }).catch(function(oError) {
        console.error("Failed to load user profile", oError);
      });
    }
  });
});