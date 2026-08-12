sap.ui.define([
  "./BaseController",
  "../model/formatter",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/core/Fragment",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(BaseController, formatter, Filter, FilterOperator, Fragment, MessageToast, MessageBox) {
  "use strict";

  var CATEGORIES = [
    { id: "article", i18nKey: "category.article" },
    { id: "documentation", i18nKey: "category.documentation" },
    { id: "report", i18nKey: "category.report" },
    { id: "tutorial", i18nKey: "category.tutorial" },
    { id: "best_practice", i18nKey: "category.bestPractice" },
    { id: "resolved_question", i18nKey: "category.resolvedQuestion" },
    { id: "faq", i18nKey: "category.faq" },
    { id: "template", i18nKey: "category.template" }
  ];

  return BaseController.extend("aymax.knowledge.controller.KnowledgeList", {

    formatter: formatter,

    onInit: function() {
      this.oModel = this.getOwnerComponent().getModel();
      formatter.setResourceBundle(this.getResourceBundle());

      this._sActiveCategory = "";
      this._sSearchQuery = "";

      var oBundle = this.getResourceBundle();
      var aTabs = [{ id: "", label: oBundle.getText("categoryAll"), active: true }]
        .concat(CATEGORIES.map(function(c) {
          return { id: c.id, label: oBundle.getText(c.i18nKey), active: false };
        }));

      this.getViewModel().setProperty("/categoryTabs", aTabs);
      this.getViewModel().setProperty("/newItem", {});
    },

    onCategoryTabPress: function(oEvent) {
      var sCategory = oEvent.getSource().getBindingContext("view").getProperty("id");
      this._sActiveCategory = sCategory;

      var aTabs = this.getViewModel().getProperty("/categoryTabs");
      aTabs.forEach(function(t) { t.active = (t.id === sCategory); });
      this.getViewModel().setProperty("/categoryTabs", aTabs);

      this._applyFilters();
    },

    onSearch: function(oEvent) {
      this._sSearchQuery = oEvent.getParameter("newValue") || "";
      this._applyFilters();
    },

    _applyFilters: function() {
      var aFilters = [];
      if (this._sActiveCategory) {
        aFilters.push(new Filter("category", FilterOperator.EQ, this._sActiveCategory));
      }
      if (this._sSearchQuery.trim()) {
        aFilters.push(new Filter("title", FilterOperator.Contains, this._sSearchQuery.trim()));
      }
      this.byId("knowledgeList").getBinding("items").filter(aFilters);
    },

    onItemPress: function(oEvent) {
      var sItemID = oEvent.getSource().getBindingContext().getProperty("ID");
      this.getRouter().navTo("detail", { itemID: sItemID });
    },

    onContribute: function() {
      if (!this._pDialog) {
        this._pDialog = Fragment.load({
          id: this.getView().getId(),
          name: "aymax.knowledge.view.CreateItemDialog",
          controller: this
        }).then(function(oDialog) {
          this.getView().addDependent(oDialog);
          return oDialog;
        }.bind(this));
      }
      this.getViewModel().setProperty("/newItem", { title: "", category: "article", excerpt: "", content: "" });
      this._pDialog.then(function(oDialog) { oDialog.open(); });
    },

    onCancelNewItem: function() {
      this._pDialog.then(function(oDialog) { oDialog.close(); });
    },

    onSaveNewItem: function() {
      var oNewItem = this.getViewModel().getProperty("/newItem");
      if (!oNewItem.title || !oNewItem.title.trim()) {
        MessageToast.show(this.getText("fieldTitle"));
        return;
      }

      var oListBinding = this.oModel.bindList("/KnowledgeItems");
      var oContext = oListBinding.create({
        title: oNewItem.title,
        category: oNewItem.category,
        excerpt: oNewItem.excerpt,
        content: oNewItem.content
      });

      oContext.created().then(function() {
        MessageToast.show(this.getText("newItemCreated"));
        this._pDialog.then(function(oDialog) { oDialog.close(); });
        this._applyFilters();
      }.bind(this)).catch(function() {
        MessageBox.error(this.getText("errorCreate"));
      }.bind(this));
    },

    // Visible only on drafts (see formatter.canSubmitForReview) - the
    // @restrict DELETE rule in knowledge-service.cds is the real guard,
    // this is just the matching affordance.
    onDeleteDraft: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      var sTitle = oContext.getProperty("title");

      MessageBox.confirm(this.getText("deleteDraftConfirmText", [sTitle]), {
        title: this.getText("deleteDraftConfirmTitle"),
        onClose: function(sAction) {
          if (sAction !== MessageBox.Action.OK) return;

          oContext.delete().then(function() {
            MessageToast.show(this.getText("draftDeleted"));
          }.bind(this)).catch(function() {
            MessageBox.error(this.getText("errorDeleteDraft"));
          }.bind(this));
        }.bind(this)
      });
    }
  });
});
