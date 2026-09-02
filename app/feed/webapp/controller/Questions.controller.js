sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/ui/core/Fragment",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/json/JSONModel",
  "aymax/feed/service/ODataService",
  "aymax/feed/model/formatter",
  "aymax/feed/model/TagPicker"
], function(Controller, MessageToast, Fragment, Filter, FilterOperator, JSONModel, ODataService, formatter, TagPicker) {
  "use strict";

  return Controller.extend("aymax.feed.controller.Questions", {
    formatter: formatter,

    // Etat local du filtre actif
    _sActiveFilter: "all",

    onInit: function() {
      this.oModel     = this.getOwnerComponent().getModel("questions");
      this.oViewModel = this.getOwnerComponent().getModel("view");
      this.oModelTags = this.getOwnerComponent().getModel("tags");
    },

    // ============================================================
    // CRÉATION QUESTION
    // ============================================================
    onCreateQuestion: function() {
      this.oViewModel.setProperty("/questionDialog", { title: "", content: "", roomID: "" });
      if (!this._pQuestionDialog) {
        // Dedicated JSONModel for the shared TagPicker fragment, set as
        // THIS DIALOG's own default (unnamed) model - kept separate from
        // "view" so it can't collide with that model's existing
        // {view>...} prefixed bindings elsewhere in the fragment.
        this._oTagPickerModel = new JSONModel({ tags: [], suggestions: [] });
        this._pQuestionDialog = Fragment.load({
          id:         this.getView().getId(),
          name:       "aymax.feed.view.fragments.QuestionCreateDialog",
          controller: this
        }).then(function(oDialog) {
          oDialog.setModel(this._oTagPickerModel);
          this.getView().addDependent(oDialog);
          TagPicker.addFreeTextValidator(this.byId("tagPickerInput"));
          return oDialog;
        }.bind(this));
      }
      this._oTagPickerModel.setData({ tags: [], suggestions: [] });
      var oTagInput = this.byId("tagPickerInput");
      if (oTagInput) oTagInput.removeAllTokens();

      if (!this._aAllTags) {
        TagPicker.loadAllTags(this.oModelTags).then(function(aAllTags) {
          this._aAllTags = aAllTags;
          this._oTagPickerModel.setProperty("/suggestions", TagPicker.filterSuggestions(aAllTags, ""));
        }.bind(this));
      } else {
        this._oTagPickerModel.setProperty("/suggestions", TagPicker.filterSuggestions(this._aAllTags, ""));
      }

      this._pQuestionDialog.then(function(oDialog) { oDialog.open(); });
    },

    onTagPickerTokenUpdate: function(oEvent) {
      var aTags = TagPicker.applyTokenUpdate(oEvent, this._oTagPickerModel.getProperty("/tags"));
      this._oTagPickerModel.setProperty("/tags", aTags);
    },

    onTagPickerLiveChange: function(oEvent) {
      var sValue = oEvent.getParameter("value");
      this._oTagPickerModel.setProperty("/suggestions", TagPicker.filterSuggestions(this._aAllTags || [], sValue));
    },

    onConfirmCreateQuestion: function() {
      var oData = this.oViewModel.getProperty("/questionDialog");
      if (!oData.title || !oData.title.trim() || !oData.content || !oData.content.trim()) {
        MessageToast.show("Le titre et la description sont obligatoires.");
        return;
      }

      TagPicker.resolveTagIDs(this.oModelTags, this._oTagPickerModel.getProperty("/tags")).then(function(aTagIDs) {
        return ODataService.callAction(this.oModel, "/createQuestion", {
          title:    oData.title.trim(),
          content:  oData.content.trim(),
          roomID:   oData.roomID || null,
          tagIDs:   aTagIDs,
          topicIDs: []
        });
      }.bind(this)).then(function() {
        this._aAllTags = null; // usageCount changed - reload next time the dialog opens
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
    // RECHERCHE (2026-09: un seul champ, titre + contenu + tags -
    // fusion des deux SearchFields précédents "Rechercher une
    // question..." et "Rechercher par tag...", qui affichaient deux
    // cases quasi vides côte à côte pour ce qui était déjà, côté tag,
    // une recherche titre/contenu/tags combinée. _applyFilters ci-
    // dessous construit maintenant ce même filtre combiné à partir
    // d'une seule requête, qu'il s'agisse d'un mot du titre, du
    // contenu, ou d'un nom de tag.)
    // ============================================================
    onSearchQuestions: function(oEvent) {
      var sQuery = oEvent.getParameter("query") || "";
      this._sSearchQuery = sQuery.trim();
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

      // Filtre texte unifié : titre, contenu, ou tag associé (vrai filtre
      // serveur sur les tags via lambda Any, même mécanisme que
      // contributors/any(...) ailleurs dans ce projet) - un seul champ de
      // recherche couvre les trois, une requête tape à la fois.
      if (this._sSearchQuery) {
        aFilters.push(new Filter({
          filters: [
            new Filter("title",   FilterOperator.Contains, this._sSearchQuery),
            new Filter("content", FilterOperator.Contains, this._sSearchQuery),
            new Filter({
              path: "tags",
              operator: "Any",
              variable: "t",
              condition: new Filter("t/tag/name", FilterOperator.Contains, this._sSearchQuery)
            })
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
