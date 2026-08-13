sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/ui/core/Fragment",
  "aymax/feed/service/ODataService",
  "aymax/feed/model/formatter"
], function(Controller, MessageToast, Fragment, ODataService, formatter) {
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
      });
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

    onChangePostStageDialog: function(oEvent) {
      var sPostID = oEvent.getSource().getBindingContext().getProperty("ID");
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
      this._pStageDialog.then(function(oDialog) { oDialog.open(); });
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
