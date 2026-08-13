sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/core/Fragment",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "aymax/feed/service/ODataService",
  "aymax/feed/model/formatter"
], function(Controller, MessageToast, MessageBox, Fragment, Filter, FilterOperator, ODataService, formatter) {
  "use strict";

  return Controller.extend("aymax.feed.controller.Topics", {
    formatter: formatter,

    _editingTopicID: null,

    onInit: function() {
      this.oModel = this.getOwnerComponent().getModel("topics");
      this.oViewModel = this.getOwnerComponent().getModel("view");
    },

    onCreateTopic: function() {
      this._editingTopicID = null;
      this.oViewModel.setProperty("/topicDialog", { name: "", description: "", color: "#1E3A8A", icon: "sap-icon://tag" });
      this._openTopicDialog();
    },

    onEditTopic: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("topics");
      if (!oContext) return;
      var oTopic = oContext.getObject();
      this._editingTopicID = oTopic.ID;
      this.oViewModel.setProperty("/topicDialog", {
        name:        oTopic.name || "",
        description: oTopic.description || "",
        color:       oTopic.color || "#1E3A8A",
        icon:        oTopic.icon || "sap-icon://tag"
      });
      this._openTopicDialog();
    },

    _openTopicDialog: function() {
      if (!this._pTopicDialog) {
        this._pTopicDialog = Fragment.load({
          id: this.getView().getId(),
          name: "aymax.feed.view.fragments.TopicCreateDialog",
          controller: this
        }).then(function(oDialog) {
          this.getView().addDependent(oDialog);
          return oDialog;
        }.bind(this));
      }
      this._pTopicDialog.then(function(oDialog) { oDialog.open(); });
    },

    onConfirmSaveTopic: function() {
      var oData = this.oViewModel.getProperty("/topicDialog");
      if (!oData.name || !oData.name.trim()) {
        MessageToast.show("Le nom du topic est requis.");
        return;
      }

      var pSave;
      if (this._editingTopicID) {
        pSave = ODataService.callAction(this.oModel, "/updateTopic", {
          topicID:     this._editingTopicID,
          name:        oData.name,
          description: oData.description || "",
          color:       oData.color || "#1E3A8A",
          icon:        oData.icon || "sap-icon://tag"
        });
      } else {
        pSave = ODataService.callAction(this.oModel, "/createTopic", {
          name:        oData.name,
          description: oData.description || "",
          color:       oData.color || "#1E3A8A",
          icon:        oData.icon || "sap-icon://tag"
        });
      }

      pSave.then(function() {
        MessageToast.show(this._editingTopicID ? "Topic modifié !" : "Topic créé avec succès !");
        this._editingTopicID = null;
        this.onCancelTopicDialog();
        this._refreshTopicsGrid();
      }.bind(this));
    },

    onCancelTopicDialog: function() {
      this._editingTopicID = null;
      this._pTopicDialog.then(function(oDialog) { oDialog.close(); });
    },

    onDeleteTopic: function(oEvent) {
      var that     = this;
      var oContext = oEvent.getSource().getBindingContext("topics");
      if (!oContext) return;
      var sTopicID   = oContext.getProperty("ID");
      var sTopicName = oContext.getProperty("name") || "ce topic";
      MessageBox.confirm(
        "Supprimer le topic « " + sTopicName + " » ? Il sera retiré de toutes les publications, rooms et questions.",
        {
          title: "Supprimer le topic",
          onClose: function(sAction) {
            if (sAction !== MessageBox.Action.OK) return;
            ODataService.callAction(that.oModel, "/deleteTopic", { topicID: sTopicID }).then(function() {
              MessageToast.show("Topic supprimé.");
              that._refreshTopicsGrid();
            });
          }
        }
      );
    },

    _refreshTopicsGrid: function() {
      var oGrid = this.byId("topicsGrid");
      if (oGrid) oGrid.getBinding("content").refresh();
    },

    onSearchTopics: function(oEvent) {
      var sQuery = oEvent.getParameter("query");
      var oGrid = this.byId("topicsGrid");
      var aFilters = [];
      if (sQuery) {
        aFilters.push(new Filter("name", FilterOperator.Contains, sQuery));
      }
      oGrid.getBinding("content").filter(aFilters);
    }
  });
});
