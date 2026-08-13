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

  return Controller.extend("aymax.feed.controller.Rooms", {
    formatter: formatter,

    _sActiveFilter: "all",
    _sSearchQuery:  "",

    onInit: function() {
      this.oModel     = this.getOwnerComponent().getModel("rooms");
      this.oViewModel = this.getOwnerComponent().getModel("view");
    },

    // ============================================================
    // NAVIGATION
    // ============================================================
    onRoomPress: function(oEvent) {
      var sRoomId = oEvent.getSource().getBindingContext().getProperty("ID")
                 || oEvent.getSource().getBindingContext("rooms") && oEvent.getSource().getBindingContext("rooms").getProperty("ID");
      // Chercher dans le contexte default ou rooms
      var oCtx = oEvent.getSource().getBindingContext() || oEvent.getSource().getBindingContext("rooms");
      if (oCtx) {
        sRoomId = oCtx.getProperty("ID");
      }
      this.getOwnerComponent().getRouter().navTo("roomDetail", { roomId: sRoomId });
    },

    // ============================================================
    // REJOINDRE / QUITTER
    // ============================================================
    onJoinRoom: function(oEvent) {
      var oCtx   = oEvent.getSource().getBindingContext() || oEvent.getSource().getBindingContext("rooms");
      var sRoomId = oCtx.getProperty("ID");
      var oFeedModel = this.getOwnerComponent().getModel();
      ODataService.callAction(oFeedModel, "/joinRoom", { roomID: sRoomId }).then(function() {
        MessageToast.show("Vous avez rejoint la room !");
        this.byId("roomsList").getBinding("items").refresh();
      }.bind(this));
    },

    onLeaveRoom: function(oEvent) {
      var oCtx   = oEvent.getSource().getBindingContext() || oEvent.getSource().getBindingContext("rooms");
      var sRoomId = oCtx.getProperty("ID");
      var oFeedModel = this.getOwnerComponent().getModel();
      ODataService.callAction(oFeedModel, "/leaveRoom", { roomID: sRoomId }).then(function() {
        MessageToast.show("Vous avez quitté la room.");
        this.byId("roomsList").getBinding("items").refresh();
      }.bind(this));
    },

    // ============================================================
    // CRÉATION ROOM
    // ============================================================
    onCreateRoom: function() {
      this.oViewModel.setProperty("/roomDialog", {
        name: "", category: "", visibility: "public", description: ""
      });
      if (!this._pRoomDialog) {
        this._pRoomDialog = Fragment.load({
          id: this.getView().getId(),
          name: "aymax.feed.view.fragments.RoomCreateDialog",
          controller: this
        }).then(function(oDialog) {
          this.getView().addDependent(oDialog);
          return oDialog;
        }.bind(this));
      }
      this._pRoomDialog.then(function(oDialog) { oDialog.open(); });
    },

    onConfirmCreateRoom: function() {
      var oData = this.oViewModel.getProperty("/roomDialog");
      if (!oData.name || !oData.name.trim()) {
        MessageToast.show("Le nom de la room est requis.");
        return;
      }
      var oListBinding = this.oModel.bindList("/Rooms");
      var oContext = oListBinding.create({
        name:        oData.name.trim(),
        category:    oData.category || "Général",
        visibility:  oData.visibility || "public",
        description: oData.description || ""
      });
      oContext.created().then(function() {
        MessageToast.show("Room créée avec succès !");
        this.onCancelCreateRoom();
        this.byId("roomsList").getBinding("items").refresh();
      }.bind(this));
    },

    onCancelCreateRoom: function() {
      this._pRoomDialog.then(function(oDialog) { oDialog.close(); });
    },

    // ============================================================
    // RECHERCHE
    // ============================================================
    onSearchRooms: function(oEvent) {
      this._sSearchQuery = oEvent.getParameter("query") || "";
      this._applyFilters();
    },

    // ============================================================
    // FILTRES (boutons pill)
    // ============================================================
    onFilterRoomAll:     function() { this._setFilter("all");      },
    onFilterRoomPublic:  function() { this._setFilter("public");   },
    onFilterRoomPrivate: function() { this._setFilter("private");  },
    onFilterRoomStage:   function() { this._setFilter("stage");    },
    onFilterRoomMine:    function() { this._setFilter("myrooms");  },

    _setFilter: function(sKey) {
      this._sActiveFilter = sKey;
      var mBtns = {
        all:     "filterRoomAll",
        public:  "filterRoomPublic",
        private: "filterRoomPrivate",
        stage:   "filterRoomStage",
        myrooms: "filterRoomMine"
      };
      Object.keys(mBtns).forEach(function(k) {
        var oBtn = this.byId(mBtns[k]);
        if (oBtn) oBtn.setType(k === sKey ? "Emphasized" : "Transparent");
      }.bind(this));
      this._applyFilters();
    },

    _applyFilters: function() {
      var oList    = this.byId("roomsList");
      var aFilters = [];

      if (this._sActiveFilter && this._sActiveFilter !== "all") {
        if (this._sActiveFilter === "myrooms") {
          // Filtre côté client — rooms où l'utilisateur est membre
          aFilters.push(new Filter("memberCount", FilterOperator.GT, 0));
        } else {
          aFilters.push(new Filter("visibility", FilterOperator.EQ, this._sActiveFilter));
        }
      }

      if (this._sSearchQuery) {
        aFilters.push(new Filter({
          filters: [
            new Filter("name",        FilterOperator.Contains, this._sSearchQuery),
            new Filter("description", FilterOperator.Contains, this._sSearchQuery),
            new Filter("category",    FilterOperator.Contains, this._sSearchQuery)
          ],
          and: false
        }));
      }

      oList.getBinding("items").filter(
        aFilters.length > 0 ? [new Filter({ filters: aFilters, and: true })] : []
      );
    },

    // ============================================================
    // FORMATTERS
    // ============================================================
    formatAvatar: function(sUrl, sName) { return formatter.formatAvatar(sUrl, sName); },

    formatVisibility: function(sV) {
      return { public: "Publique", private: "Privée", stage: "Stage" }[sV] || sV;
    },

    formatVisibilityState: function(sV) {
      return { public: "Success", private: "Warning", stage: "Information" }[sV] || "None";
    },

    // Compatibilité SegmentedButton ancien
    onFilterChange: function(oEvent) {
      var sKey = oEvent.getParameter("item") ? oEvent.getParameter("item").getKey() : "all";
      this._setFilter(sKey);
    }
  });
});
