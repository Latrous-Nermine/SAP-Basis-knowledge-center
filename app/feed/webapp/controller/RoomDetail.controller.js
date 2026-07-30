sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/ui/core/format/DateFormat"
], function(Controller, MessageToast, DateFormat) {
  "use strict";

  return Controller.extend("aymax.feed.controller.RoomDetail", {

    onInit: function() {
      this.oModel = this.getOwnerComponent().getModel();
      this.oViewModel = this.getOwnerComponent().getModel("view");
      this.getOwnerComponent().getRouter().getRoute("roomDetail").attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function(oEvent) {
      this._sRoomId = oEvent.getParameter("arguments").roomId;
      this._loadRoomData();
      this._loadRoomFeed();
      this._loadRoomMembers();
    },

    _loadRoomData: function() {
      var oModel = this.oModel;
      var oViewModel = this.oViewModel;
      oModel.bindContext("/Rooms(" + this._sRoomId + ")").requestObject().then(function(oData) {
        oViewModel.setProperty("/room", oData);
      });
    },

    _loadRoomFeed: function() {
      var oList = this.byId("roomFeedList");
      oList.bindItems({
        path: "/Posts",
        parameters: {
          $filter: "room_ID eq " + this._sRoomId + " and status eq 'published'",
          $expand: "author,tags",
          $orderby: "createdAt desc"
        },
        template: oList.getBindingInfo("items").template
      });
    },

    _loadRoomMembers: function() {
      var oList = this.byId("membersList");
      oList.bindItems({
        path: "/RoomMembers",
        parameters: {
          $filter: "room_ID eq " + this._sRoomId
        },
        template: oList.getBindingInfo("items").template
      });
    },

    formatAvatar: function(sUrl, sName) {
      if (sUrl && sUrl !== "null" && sUrl !== "") return sUrl;
      var initials = sName ? sName.replace(/[^A-Z]/g, "").substring(0, 2) : "AY";
      return "https://ui-avatars.com/api/?name=" + encodeURIComponent(sName || "AYMAX") +
             "&background=1E3A8A&color=fff&size=128";
    },

    formatDate: function(sDate) {
      if (!sDate) return "";
      var oFormatter = DateFormat.getDateTimeInstance({ style: "short" });
      return oFormatter.format(new Date(sDate));
    },

    onNavBack: function() {
      this.getOwnerComponent().getRouter().navTo("rooms");
    },

    onJoinRoom: function() {
      var oActionContext = this.oModel.bindContext("/joinRoom")({ roomID: this._sRoomId });
      oActionContext.execute().then(function() {
        MessageToast.show("Vous avez rejoint la room !");
        this._loadRoomData();
      }.bind(this));
    },

    onLeaveRoom: function() {
      var oActionContext = this.oModel.bindContext("/leaveRoom")({ roomID: this._sRoomId });
      oActionContext.execute().then(function() {
        MessageToast.show("Vous avez quitté la room.");
        this._loadRoomData();
      }.bind(this));
    },

    onPublishInRoom: function() {
      var sText = this.oViewModel.getProperty("/postText");
      if (!sText || sText.trim().length === 0) return;
      var oListBinding = this.oModel.bindList("/Posts");
      var oContext = oListBinding.create({
        content: sText,
        type: "knowledge",
        status: "published",
        room_ID: this._sRoomId
      });
      oContext.created().then(function() {
        MessageToast.show("Publication envoyée !");
        this.oViewModel.setProperty("/postText", "");
        this._loadRoomFeed();
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
      oActionContext.execute().then(function() { oContext.refresh(); });
    },

    onTabSelect: function(oEvent) {
      var sKey = oEvent.getParameter("key");
      if (sKey === "members") this._loadRoomMembers();
      if (sKey === "feed") this._loadRoomFeed();
    }
  });
});
