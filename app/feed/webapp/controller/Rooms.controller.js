sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function(Controller, MessageToast) {
  "use strict";

  return Controller.extend("aymax.feed.controller.Rooms", {

    onInit: function() {
      this.oModel = this.getOwnerComponent().getModel();
      this.oViewModel = this.getOwnerComponent().getModel("view");
    },

    formatAvatar: function(sUrl, sName) {
      if (sUrl && sUrl !== "null" && sUrl !== "") return sUrl;
      var initials = sName ? sName.replace(/[^A-Z]/g, "").substring(0, 2) : "AY";
      return "https://ui-avatars.com/api/?name=" + encodeURIComponent(sName || "AYMAX") +
             "&background=1E3A8A&color=fff&size=128";
    },

    onRoomPress: function(oEvent) {
      var sRoomId = oEvent.getSource().getBindingContext().getProperty("ID");
      this.getOwnerComponent().getRouter().navTo("roomDetail", { roomId: sRoomId });
    },

    onJoinRoom: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      var sRoomId = oContext.getProperty("ID");
      var oActionContext = this.oModel.bindContext("/joinRoom")({ roomID: sRoomId });
      oActionContext.execute().then(function() {
        MessageToast.show("Vous avez rejoint la room !");
        oContext.refresh();
      });
    },

    onLeaveRoom: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      var sRoomId = oContext.getProperty("ID");
      var oActionContext = this.oModel.bindContext("/leaveRoom")({ roomID: sRoomId });
      oActionContext.execute().then(function() {
        MessageToast.show("Vous avez quitté la room.");
        oContext.refresh();
      });
    },

    onSearchRooms: function(oEvent) {
      var sQuery = oEvent.getParameter("query");
      var oList = this.byId("roomsList");
      var aFilters = [];
      if (sQuery) {
        aFilters.push(new sap.ui.model.Filter("name", "Contains", sQuery));
      }
      oList.getBinding("items").filter(aFilters);
    },

    onFilterChange: function(oEvent) {
      var sKey = oEvent.getParameter("item").getKey();
      var oList = this.byId("roomsList");
      var aFilters = [];
      if (sKey !== "all") {
        if (sKey === "myrooms") {
          // Filtre sur les rooms suivies — à implémenter côté backend
          aFilters.push(new sap.ui.model.Filter("isFollowed", "EQ", true));
        } else {
          aFilters.push(new sap.ui.model.Filter("category", "EQ", sKey));
        }
      }
      oList.getBinding("items").filter(aFilters);
    },

    onCreateRoom: function() {
      // Ouvrir un dialog de création — à implémenter
      MessageToast.show("Création de room — à implémenter");
    },

    onNavTo: function(oEvent) {
      var sKey = oEvent.getParameter("item").getKey();
      if (sKey === "feed") this.getOwnerComponent().getRouter().navTo("feed");
      if (sKey === "questions") this.getOwnerComponent().getRouter().navTo("questions");
    }
  });
});
