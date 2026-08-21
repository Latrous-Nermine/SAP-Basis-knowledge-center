sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/ui/core/Fragment",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "aymax/feed/service/ODataService",
  "aymax/feed/model/formatter"
], function(Controller, MessageToast, Fragment, Filter, FilterOperator, ODataService, formatter) {
  "use strict";

  return Controller.extend("aymax.feed.controller.RoomDetail", {
    formatter: formatter,

    onInit: function() {
      this.oModel = this.getOwnerComponent().getModel("rooms");
      this.oFeedModel = this.getOwnerComponent().getModel();
      this.oViewModel = this.getOwnerComponent().getModel("view");
      this.getOwnerComponent().getRouter().getRoute("roomDetail").attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function(oEvent) {
      this._sRoomId = oEvent.getParameter("arguments").roomId;
      this._loadRoomData();
    },

    _loadRoomData: function() {
      var self = this;
      var oContext = this.oModel.bindContext("/Rooms(" + this._sRoomId + ")");
      oContext.requestObject().then(function(oData) {
        self.oViewModel.setProperty("/room", oData);

        // Only one seeded room actually has a stage pipeline defined
        // today - the "move stage" button only makes sense (and only
        // appears) where one exists, rather than showing a picker with
        // nothing to pick. Chained after /room is set, not run in
        // parallel: setProperty("/room/hasStages", ...) needs /room to
        // already be an object, not still pending from the call above.
        self.oModel.bindList("/RoomStages", null, null, new Filter("room_ID", FilterOperator.EQ, self._sRoomId))
          .requestContexts(0, 1).then(function(aContexts) {
            self.oViewModel.setProperty("/room/hasStages", aContexts.length > 0);
          });
      });

      // roomFeedList/membersList query the WHOLE cross-room Posts/
      // RoomMembers collections (RoomsService has no server-side
      // per-room scoping of its own) - filtering client-side to just
      // this room is the same thing onPublishInRoom already assumes
      // when it sets room_ID on a new post.
      var oRoomFilter = new Filter("room_ID", FilterOperator.EQ, this._sRoomId);
      this.byId("roomFeedList").getBinding("items").filter(oRoomFilter);
      this.byId("membersList").getBinding("items").filter(oRoomFilter);
    },

    onNavBack: function() {
      this.getOwnerComponent().getRouter().navTo("rooms");
    },

    onJoinRoom: function() {
      ODataService.callAction(this.oModel, "/joinRoom", { roomID: this._sRoomId }).then(function() {
        MessageToast.show("Vous avez rejoint la room !");
        this._loadRoomData();
      }.bind(this));
    },

    onLeaveRoom: function() {
      ODataService.callAction(this.oModel, "/leaveRoom", { roomID: this._sRoomId }).then(function() {
        MessageToast.show("Vous avez quitté la room.");
        this._loadRoomData();
      }.bind(this));
    },

    onPublishInRoom: function() {
      var sText = this.oViewModel.getProperty("/postText");
      if (!sText || !sText.trim()) return;
      var oListBinding = this.oFeedModel.bindList("/Posts");
      var oContext = oListBinding.create({
        content: sText.trim(),
        type: "knowledge",
        status: "published",
        room_ID: this._sRoomId
      });
      oContext.created().then(function() {
        MessageToast.show("Publication envoyée !");
        this.oViewModel.setProperty("/postText", "");
        this.byId("roomFeedList").getBinding("items").refresh();
      }.bind(this));
    },

    onLikePress: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("rooms");
      var sPostID = oContext.getProperty("ID");
      var bLiked = oContext.getProperty("isLikedByMe");
      // likePost/unlikePost live on FeedService, not RoomsService (which
      // has no social actions of its own) - same cross-service call
      // shape as promoteQuestion, just the other direction.
      ODataService.callAction(this.oFeedModel, bLiked ? "/unlikePost" : "/likePost", { postID: sPostID }).then(function() {
        this.byId("roomFeedList").getBinding("items").refresh();
      }.bind(this));
    },

    onShare: function(oEvent) {
      var sPostID = oEvent.getSource().getBindingContext("rooms").getProperty("ID");
      ODataService.callAction(this.oFeedModel, "/sharePost", { postID: sPostID }).then(function() {
        MessageToast.show("Publication partagée !");
        this.byId("roomFeedList").getBinding("items").refresh();
      }.bind(this));
    },

    onChangePostStageDialog: function(oEvent) {
      var sPostID = oEvent.getSource().getBindingContext("rooms").getProperty("ID");
      this.oViewModel.setProperty("/stageDialog", { postID: sPostID, stageID: "", comment: "" });
      if (!this._pStageDialog) {
        this._pStageDialog = Fragment.load({
          id: this.getView().getId(),
          name: "aymax.feed.view.fragments.StageChangeDialog",
          controller: this
        }).then(function(oDialog) {
          this.getView().addDependent(oDialog);
          return oDialog;
        }.bind(this));
      }
      this._pStageDialog.then(function(oDialog) {
        // The fragment's Select binds the whole /RoomStages collection
        // (every room's stages, not just this one) - scoping it here
        // rather than in the fragment itself, since the fragment has no
        // way to know which room it was opened from.
        var oSelect = Fragment.byId(this.getView().getId(), "stageSelect");
        var oBinding = oSelect && oSelect.getBinding("items");
        if (oBinding) oBinding.filter(new Filter("room_ID", FilterOperator.EQ, this._sRoomId));
        oDialog.open();
      }.bind(this));
    },

    onConfirmStageChange: function() {
      var oData = this.oViewModel.getProperty("/stageDialog");
      if (!oData.stageID) {
        MessageToast.show("Veuillez sélectionner un stage.");
        return;
      }
      ODataService.callAction(this.oModel, "/changePostStage", {
        postID: oData.postID,
        stageID: oData.stageID,
        comment: oData.comment || ""
      }).then(function() {
        MessageToast.show("Stage de la publication mis à jour !");
        this.onCancelStageDialog();
        this.byId("roomFeedList").getBinding("items").refresh();
      }.bind(this));
    },

    onCancelStageDialog: function() {
      this._pStageDialog.then(function(oDialog) { oDialog.close(); });
    }
  });
});
