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

    formatAvatar: function(sUrl, sName) {
      if (sUrl && sUrl !== "null" && sUrl !== "") return sUrl;
      var initials = sName ? sName.replace(/[^A-Z]/g, "").substring(0, 2) : "AY";
      return "https://ui-avatars.com/api/?name=" + encodeURIComponent(sName || "AYMAX") + "&background=1E3A8A&color=fff&size=128";
    },

    formatDate: function(sDate) {
      if (!sDate) return "";
      var oFormatter = DateFormat.getDateTimeInstance({ style: "short" });
      return oFormatter.format(new Date(sDate));
    },

    formatFileSize: function(iBytes) {
      if (!iBytes) return "0 B";
      var sizes = ['B', 'KB', 'MB', 'GB'];
      var i = Math.floor(Math.log(iBytes) / Math.log(1024));
      return Math.round(iBytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    },

    formatFileIcon: function(sType) {
      var mIcons = { pdf: "sap-icon://pdf-attachment", doc: "sap-icon://doc-attachment", docx: "sap-icon://doc-attachment" };
      return mIcons[sType] || "sap-icon://attachment";
    },

    onPublishPost: function() {
      var sText = this.oViewModel.getProperty("/postText");
      if (!sText || sText.trim().length === 0) return;
      var oListBinding = this.oModel.bindList("/Posts");
      var oContext = oListBinding.create({ content: sText, type: "knowledge", status: "published" });
      oContext.created().then(function() {
        MessageToast.show("Publication envoyée !");
        this.oViewModel.setProperty("/postText", "");
        this.byId("feedList").getBinding("items").refresh();
      }.bind(this));
    },

    onLikePress: function(oEvent) {
      var oSource = oEvent.getSource();
      var oContext = oSource.getBindingContext();
      var sPostID = oContext.getProperty("ID");
      var bLiked = oSource.getPressed();
      var sAction = bLiked ? "likePost" : "unlikePost";
      var oActionContext = this.oModel.bindContext("/" + sAction)({ postID: sPostID });
      oActionContext.execute().then(function() { oContext.refresh(); });
    },

    onShare: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      var oActionContext = this.oModel.bindContext("/sharePost")({ postID: oContext.getProperty("ID") });
      oActionContext.execute().then(function() { oContext.refresh(); MessageToast.show("Partagé !"); });
    },

    onFilterChange: function(oEvent) {
      var sKey = oEvent.getParameter("item").getKey();
      var oList = this.byId("feedList");
      var aFilters = [new sap.ui.model.Filter("status", "EQ", "published")];
      oList.getBinding("items").filter(aFilters);
    },

    onSearch: function(oEvent) {},

    onNavToRooms: function() {
      this.getOwnerComponent().getRouter().navTo("rooms");
    },

    onRoomPress: function(oEvent) {
      var sRoomId = oEvent.getSource().getBindingContext().getProperty("ID");
      this.getOwnerComponent().getRouter().navTo("roomDetail", { roomId: sRoomId });
    }
  });
});