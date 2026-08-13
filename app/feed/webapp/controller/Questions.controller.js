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

  return Controller.extend("aymax.feed.controller.Questions", {
    formatter: formatter,

    // Etat local du filtre actif
    _sActiveFilter: "all",
    _sActiveTag:    "",

    onInit: function() {
      this.oModel     = this.getOwnerComponent().getModel("questions");
      this.oViewModel = this.getOwnerComponent().getModel("view");
    },

    // ============================================================
    // CRÉATION QUESTION
    // ============================================================
    onCreateQuestion: function() {
      this.oViewModel.setProperty("/questionDialog", { title: "", content: "", roomID: "" });
      if (!this._pQuestionDialog) {
        this._pQuestionDialog = Fragment.load({
          id:         this.getView().getId(),
          name:       "aymax.feed.view.fragments.QuestionCreateDialog",
          controller: this
        }).then(function(oDialog) {
          this.getView().addDependent(oDialog);
          return oDialog;
        }.bind(this));
      }
      this._pQuestionDialog.then(function(oDialog) { oDialog.open(); });
    },

    onConfirmCreateQuestion: function() {
      var oData = this.oViewModel.getProperty("/questionDialog");
      if (!oData.title || !oData.title.trim() || !oData.content || !oData.content.trim()) {
        MessageToast.show("Le titre et la description sont obligatoires.");
        return;
      }

      ODataService.callAction(this.oModel, "/createQuestion", {
        title:    oData.title.trim(),
        content:  oData.content.trim(),
        roomID:   oData.roomID || null,
        tagIDs:   [],
        topicIDs: []
      }).then(function() {
        MessageToast.show("Question publiée !");
        this.onCancelQuestionDialog();
        this.byId("questionsList").getBinding("items").refresh();
      }.bind(this));
    },

    onCancelQuestionDialog: function() {
      this._pQuestionDialog.then(function(oDialog) { oDialog.close(); });
    },

    // ============================================================
    // NAVIGATION
    // ============================================================
    onQuestionPress: function(oEvent) {
      var sQuestionId = oEvent.getSource().getBindingContext("questions").getProperty("ID");
      this.getOwnerComponent().getRouter().navTo("questionDetail", { questionId: sQuestionId });
    },

    // ============================================================
    // RECHERCHE PAR TEXTE
    // ============================================================
    onSearchQuestions: function(oEvent) {
      var sQuery = oEvent.getParameter("query") || "";
      this._sSearchQuery = sQuery;
      this._applyFilters();
    },

    // ============================================================
    // RECHERCHE PAR TAG
    // ============================================================
    onSearchByTag: function(oEvent) {
      var sTag = oEvent.getParameter("query") || "";
      this._sActiveTag = sTag.trim();

      // Afficher/masquer le bandeau "Tag filtré"
      var oTagBox   = this.byId("activeTagFilterBox");
      var oTagToken = this.byId("activeTagToken");

      if (this._sActiveTag) {
        oTagToken.setText(this._sActiveTag);
        oTagBox.setVisible(true);
      } else {
        oTagBox.setVisible(false);
      }

      this._applyFilters();
    },

    onClearTagFilter: function() {
      this._sActiveTag = "";
      this.byId("activeTagFilterBox").setVisible(false);
      this.byId("tagSearchField").setValue("");
      this._applyFilters();
    },

    // ============================================================
    // FILTRES STATUT (boutons Toutes / Résolues / Ouvertes)
    // ============================================================
    onFilterAll: function() {
      this._setActiveFilterButton("all");
      this._applyFilters();
    },

    onFilterResolved: function() {
      this._setActiveFilterButton("resolved");
      this._applyFilters();
    },

    onFilterOpen: function() {
      this._setActiveFilterButton("open");
      this._applyFilters();
    },

    _setActiveFilterButton: function(sKey) {
      this._sActiveFilter = sKey;

      // Mettre à jour le style des boutons
      var mBtnKeys = { all: "filterAll", resolved: "filterResolved", open: "filterOpen" };
      Object.keys(mBtnKeys).forEach(function(k) {
        var oBtn = this.byId(mBtnKeys[k]);
        if (oBtn) {
          oBtn.setType(k === sKey ? "Emphasized" : "Transparent");
        }
      }.bind(this));
    },

    // ============================================================
    // APPLICATION DES FILTRES COMBINÉS
    // ============================================================
    _applyFilters: function() {
      var oList    = this.byId("questionsList");
      var aFilters = [];

      // Filtre statut
      if (this._sActiveFilter && this._sActiveFilter !== "all") {
        aFilters.push(new Filter("status", FilterOperator.EQ, this._sActiveFilter));
      }

      // Filtre texte (titre ou contenu)
      if (this._sSearchQuery) {
        aFilters.push(new Filter({
          filters: [
            new Filter("title",   FilterOperator.Contains, this._sSearchQuery),
            new Filter("content", FilterOperator.Contains, this._sSearchQuery)
          ],
          and: false
        }));
      }

      // Filtre tag — recherche dans les tags associés à la question
      // (filtrage côté client sur la propriété dénormalisée, ou côté serveur si disponible)
      if (this._sActiveTag) {
        // Filtre sur le titre/contenu contenant le nom du tag comme fallback client
        // En production : utiliser $filter=tags/any(t: contains(t/tag/name, '...'))
        aFilters.push(new Filter({
          filters: [
            new Filter("title",   FilterOperator.Contains, this._sActiveTag),
            new Filter("content", FilterOperator.Contains, this._sActiveTag)
          ],
          and: false
        }));
      }

      oList.getBinding("items").filter(aFilters.length > 0 ? [new Filter({ filters: aFilters, and: true })] : []);
    },

    // ============================================================
    // COMPATIBILITÉ ancien onFilterChange (SegmentedButton supprimé mais garde pour sécurité)
    // ============================================================
    onFilterChange: function(oEvent) {
      var sKey = oEvent.getParameter("item") ? oEvent.getParameter("item").getKey() : "all";
      this._setActiveFilterButton(sKey);
      this._applyFilters();
    },

    // ============================================================
    // FORMATTER délégué
    // ============================================================
    formatRelativeTime: function(sDate) { return formatter.formatRelativeTime(sDate); }
  });
});
