sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/core/Fragment",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/Sorter",
  "aymax/feed/service/ODataService",
  "aymax/feed/model/formatter"
], function(Controller, MessageToast, MessageBox, Fragment, Filter, FilterOperator, Sorter, ODataService, formatter) {
  "use strict";

  return Controller.extend("aymax.feed.controller.Tags", {
    formatter: formatter,

    _sActiveFilter: "all",
    _sSearchQuery:  "",

    onInit: function() {
      this.oModel     = this.getOwnerComponent().getModel("tags");
      this.oViewModel = this.getOwnerComponent().getModel("view");
    },

    // ============================================================
    // CRÉATION TAG
    // ============================================================
    onCreateTag: function() {
      this.oViewModel.setProperty("/tagDialog", { name: "", color: "#1E3A8A", description: "" });
      if (!this._pTagDialog) {
        this._pTagDialog = Fragment.load({
          id: this.getView().getId(),
          name: "aymax.feed.view.fragments.TagCreateDialog",
          controller: this
        }).then(function(oDialog) {
          this.getView().addDependent(oDialog);
          return oDialog;
        }.bind(this));
      }
      this._pTagDialog.then(function(oDialog) { oDialog.open(); });
    },

    onConfirmCreateTag: function() {
      var oData = this.oViewModel.getProperty("/tagDialog");
      if (!oData.name || !oData.name.trim()) {
        MessageToast.show("Le nom du tag est requis.");
        return;
      }
      ODataService.callAction(this.oModel, "/createTag", {
        name:        oData.name.trim(),
        color:       oData.color || "#1E3A8A",
        icon:        "",
        description: oData.description || ""
      }).then(function() {
        MessageToast.show("Tag créé !");
        this.onCancelTagDialog();
        this._refreshTable();
      }.bind(this));
    },

    onCancelTagDialog: function() {
      this._pTagDialog.then(function(oDialog) { oDialog.close(); });
    },

    // ============================================================
    // FUSION TAGS
    // ============================================================
    onMergeTagsDialog: function() {
      this.oViewModel.setProperty("/mergeDialog", { sourceTagID: "", targetTagID: "" });
      if (!this._pMergeDialog) {
        this._pMergeDialog = Fragment.load({
          id: this.getView().getId(),
          name: "aymax.feed.view.fragments.TagMergeDialog",
          controller: this
        }).then(function(oDialog) {
          this.getView().addDependent(oDialog);
          return oDialog;
        }.bind(this));
      }
      this._pMergeDialog.then(function(oDialog) { oDialog.open(); });
    },

    onConfirmMergeTags: function() {
      var oData = this.oViewModel.getProperty("/mergeDialog");
      if (!oData.sourceTagID || !oData.targetTagID) {
        MessageToast.show("Veuillez sélectionner le tag source et le tag cible.");
        return;
      }
      ODataService.callAction(this.oModel, "/mergeTags", {
        sourceTagID: oData.sourceTagID,
        targetTagID: oData.targetTagID
      }).then(function() {
        MessageToast.show("Tags fusionnés avec succès !");
        this.onCancelMergeDialog();
        this._refreshTable();
      }.bind(this));
    },

    onCancelMergeDialog: function() {
      this._pMergeDialog.then(function(oDialog) { oDialog.close(); });
    },

    // ============================================================
    // SUPPRESSION TAG
    // ============================================================
    onDeleteTag: function(oEvent) {
      var that     = this;
      var oContext = oEvent.getSource().getBindingContext("tags");
      if (!oContext) return;
      var sTagID   = oContext.getProperty("ID");
      var sTagName = oContext.getProperty("name") || "ce tag";
      MessageBox.confirm(
        "Supprimer le tag « " + sTagName + " » ? Il sera retiré de toutes les publications et questions.",
        {
          title: "Supprimer le tag",
          onClose: function(sAction) {
            if (sAction !== MessageBox.Action.OK) return;
            ODataService.callAction(that.oModel, "/deleteTag", { tagID: sTagID }).then(function() {
              MessageToast.show("Tag supprimé.");
              that._refreshTable();
            });
          }
        }
      );
    },

    onSelectTag: function(oEvent) {
      // Filtre la liste par le tag sélectionné dans le nuage
      var oCtx = oEvent.getSource().getBindingContext("tags");
      var sName = oCtx ? oCtx.getProperty("name") : "";
      if (sName) {
        this.byId("tagSearchField").setValue(sName);
        this._sSearchQuery = sName;
        this._applyFilters();
      }
    },

    // ============================================================
    // RECHERCHE
    // ============================================================
    onSearchTags: function(oEvent) {
      this._sSearchQuery = oEvent.getParameter("query") || "";
      this._applyFilters();
    },

    // ============================================================
    // FILTRES (boutons pill)
    // ============================================================
    onFilterTagAll:     function() { this._setFilter("all");      },
    onFilterTagPopular: function() { this._setFilter("popular");  },

    _setFilter: function(sKey) {
      this._sActiveFilter = sKey;
      var mBtns = { all: "filterTagAll", popular: "filterTagPopular" };
      Object.keys(mBtns).forEach(function(k) {
        var oBtn = this.byId(mBtns[k]);
        if (oBtn) oBtn.setType(k === sKey ? "Emphasized" : "Transparent");
      }.bind(this));
      this._applyFilters();
    },

    _applyFilters: function() {
      var oTable   = this.byId("tagsTable");
      var aFilters = [];
      var aSorters = [];

      // Filtre texte
      if (this._sSearchQuery) {
        aFilters.push(new Filter({
          filters: [
            new Filter("name",        FilterOperator.Contains, this._sSearchQuery),
            new Filter("description", FilterOperator.Contains, this._sSearchQuery)
          ],
          and: false
        }));
      }

      // Tri selon filtre actif
      if (this._sActiveFilter === "popular") {
        aSorters.push(new Sorter("usageCount", true)); // descendant
      } else {
        aSorters.push(new Sorter("name", false)); // alphabétique
      }

      var oBinding = oTable.getBinding("items");
      oBinding.filter(aFilters.length > 0 ? [new Filter({ filters: aFilters, and: true })] : []);
      oBinding.sort(aSorters);
    },

    _refreshTable: function() {
      var oTable = this.byId("tagsTable");
      if (oTable) oTable.getBinding("items").refresh();
    }
  });
});
