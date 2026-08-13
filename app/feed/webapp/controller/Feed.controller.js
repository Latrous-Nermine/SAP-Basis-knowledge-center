sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function(Controller, MessageToast) {
  "use strict";

  return Controller.extend("aymax.feed.controller.Feed", {
    
    onInit: function() {
      this.oModel = this.getOwnerComponent().getModel();
      this.oViewModel = this.getOwnerComponent().getModel("view");
    },

    // --- ACTIONS ---

    onPublishPost: function() {
      var sText = this.oViewModel.getProperty("/postText");
      if (!sText || sText.trim().length === 0) return;

      var oListBinding = this.oModel.bindList("/Posts");
      var oContext = oListBinding.create({
        content: sText,
        type: "knowledge",
        status: "published"
      });

      oContext.created().then(function() {
        MessageToast.show("Publication envoyée !");
        this.oViewModel.setProperty("/postText", "");
        this._refreshFeed();
      }.bind(this)).catch(function(oError) {
        MessageToast.show("Erreur lors de la publication");
      });
    },

    onLikePress: function(oEvent) {
      var oSource = oEvent.getSource();
      var oContext = oSource.getBindingContext();
      var sPostID = oContext.getProperty("ID");
      var bLiked = oSource.getPressed();

      var sAction = bLiked ? "likePost" : "unlikePost";

      var oActionContext = this.oModel.bindContext("/" + sAction + "(...)");
      oActionContext.setParameter("postID", sPostID);

      oActionContext.execute().then(function() {
        oContext.refresh();
      }).catch(function() {
        oSource.setPressed(!bLiked);
      });
    },

    onAddComment: function(oEvent) {
      var sContent = oEvent.getParameter("value");
      var oContext = oEvent.getSource().getBindingContext();
      var sPostID = oContext.getProperty("ID");

      var oActionContext = this.oModel.bindContext("/addComment(...)");
      oActionContext.setParameter("postID", sPostID);
      oActionContext.setParameter("content", sContent);

      oActionContext.execute().then(function() {
        oContext.refresh();
        MessageToast.show("Commentaire ajouté");
      });
    },

    onShare: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      var sPostID = oContext.getProperty("ID");
      
      var oActionContext = this.oModel.bindContext("/sharePost(...)");
      oActionContext.setParameter("postID", sPostID);

      oActionContext.execute().then(function() {
        MessageToast.show("Partagé !");
        oContext.refresh();
      });
    },

    onFilterChange: function(oEvent) {
      // À implémenter selon le filtre sélectionné
    },

    onSearch: function(oEvent) {
      // À implémenter
    },

    _refreshFeed: function() {
      var oList = this.byId("feedList");
      if (oList) {
        oList.getBinding("items").refresh();
      }
    },

    // --- FORMATTERS ---

    formatHasComments: function(iCount) {
      return !!iCount && iCount > 0;
    },

    formatAvatar: function(sName) {
      return "https://ui-avatars.com/api/?name=" + encodeURIComponent(sName || "?") + "&background=1E3A8A&color=fff&size=128";
    },

    formatFileIcon: function(sType) {
      var mIcons = {
        "pdf": "sap-icon://pdf-attachment",
        "doc": "sap-icon://doc-attachment",
        "docx": "sap-icon://doc-attachment",
        "xls": "sap-icon://excel-attachment",
        "xlsx": "sap-icon://excel-attachment",
        "ppt": "sap-icon://ppt-attachment"
      };
      return mIcons[sType] || "sap-icon://attachment";
    }
  });
});