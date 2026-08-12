sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/ui/core/format/DateFormat"
], function(Controller, MessageToast, DateFormat) {
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
      
      var oActionContext = this.oModel.bindContext("/" + sAction)({
        postID: sPostID
      });
      
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

      var oActionContext = this.oModel.bindContext("/addComment")({
        postID: sPostID,
        content: sContent
      });
      
      oActionContext.execute().then(function() {
        oContext.refresh();
        MessageToast.show("Commentaire ajouté");
      });
    },

    onKnowledgeCenterPress: function() {
      // Knowledge Centre now lives in the shared app/webapp (migrated off
      // its former standalone app) - still a full navigation, since Feed
      // remains its own separate app under this shell's own router.
      window.location.href = "/webapp/index.html#/knowledge";
    },

    onProfilePress: function(oEvent) {
      // Two callers share this handler: the own-avatar panel (no binding
      // context) and each Experts-to-découvrir list item (has its own
      // UserProfiles binding context - a specific OTHER user, so that ID
      // must be used directly).
      var oContext = oEvent.getSource().getBindingContext();
      if (oContext) {
        this._navigateToProfile(oContext.getProperty("userID"));
        return;
      }

      // Own-avatar case: navigate bare, no userID resolved here - same
      // approach the shared app's own navbar "Profil" link uses.
      // Profile.controller.js's own _onRouteMatched resolves "who am I"
      // via PeopleService's getMyUserID(), which is what's actually
      // authenticated; resolving it here first via FeedService's
      // getCurrentUserProfile() was the source of the "impossible
      // d'ouvrir" bug (that function has no @restrict, so it silently
      // answers for whichever identity happens to be cached - or none -
      // instead of the one PeopleService actually knows).
      window.location.href = "/webapp/index.html#/profile";
    },

    _navigateToProfile: function(sUserID) {
      if (!sUserID) return;
      window.location.href = "/webapp/index.html#/profile/" + encodeURIComponent(sUserID);
    },

    onNotificationsPress: function() {
      // Notifications now lives in the shared app/webapp (migrated off its
      // former standalone app) - still a full navigation, since Feed
      // remains its own separate app under this shell's own router.
      window.location.href = "/webapp/index.html#/notifications";
    },

    onRoomPress: function(oEvent) {
      var sRoomName = oEvent.getSource().getBindingContext().getProperty("name");
      MessageToast.show("Room : " + sRoomName);
    },

    onNavToRooms: function() {
      MessageToast.show("Rooms - à venir (Lot 3)");
    },

    onShare: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      var sPostID = oContext.getProperty("ID");
      
      var oActionContext = this.oModel.bindContext("/sharePost")({
        postID: sPostID
      });
      
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

    formatDate: function(sDate) {
      if (!sDate) return "";
      var oDate = new Date(sDate);
      var oFormatter = DateFormat.getDateTimeInstance({ style: "short" });
      return oFormatter.format(oDate);
    },

    formatFileSize: function(iBytes) {
      if (!iBytes) return "0 B";
      var sizes = ['B', 'KB', 'MB', 'GB'];
      var i = Math.floor(Math.log(iBytes) / Math.log(1024));
      return Math.round(iBytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
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
    },

    formatAvatar: function(sUrl, sName) {
      if (sUrl && sUrl !== "null" && sUrl !== "") return sUrl;
      return "https://ui-avatars.com/api/?name=" + encodeURIComponent(sName || "AYMAX") + "&background=1E3A8A&color=fff&size=128";
    }
  });
});