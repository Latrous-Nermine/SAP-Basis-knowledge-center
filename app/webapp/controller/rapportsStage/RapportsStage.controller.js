sap.ui.define([
  "../BaseController",
  "../../model/rapportsStage/formatter",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(BaseController, formatter, MessageToast, MessageBox) {
  "use strict";

  return BaseController.extend("aymax.hub.controller.rapportsStage.RapportsStage", {

    formatter: formatter,

    getResourceBundle: function() {
      return this.getOwnerComponent().getModel("i18n-rapportsStage").getResourceBundle();
    },

    getViewModel: function() {
      return this.getOwnerComponent().getModel("view-rapportsStage");
    },

    onInit: function() {
      formatter.setResourceBundle(this.getResourceBundle());
      this.getViewModel().setProperty("/hasReport", false);
      this.getViewModel().setProperty("/loaded", false);

      this.oModel = this.getOwnerComponent().getModel("rapportsStage");
      this._loadMyReport();
    },

    // Same "auto-bind to the first row the caller can see" the original
    // shipped with - one report per internship by design, and the
    // service's own @restrict already scopes /Rapports to the caller's
    // own report (or, for a manager/HR/Admin, everyone's - this page is
    // an intern's self-service editor, not built for that audience).
    _loadMyReport: function() {
      var oView = this.getView();
      var oViewModel = this.getViewModel();
      var oListBinding = this.oModel.bindList("/Rapports");

      oListBinding.requestContexts(0, 1).then(function(aContexts) {
        oViewModel.setProperty("/loaded", true);
        if (!aContexts || !aContexts.length) {
          oViewModel.setProperty("/hasReport", false);
          return;
        }
        oView.bindElement({
          model: "rapportsStage",
          path: aContexts[0].getPath(),
          parameters: { $expand: "history" }
        });
        oViewModel.setProperty("/hasReport", true);
      }).catch(function(oError) {
        oViewModel.setProperty("/loaded", true);
        MessageBox.error((oError && oError.message) || this.getText("errorSubmit"));
      }.bind(this));
    },

    onHomePress: function() {
      // Feed is rendered inside this shell at its own "feed" route
      // (view/feed/Feed.view.xml) - navigate via the router, not a
      // hard page load to the standalone /feed/webapp app.
      this.getRouter().navTo("feed");
    },

    // title/period/body are two-way bound directly to the OData v4
    // context, which flushes in the default "$auto" group as the user
    // types - the toast is confirming autosave that already happened,
    // not triggering it (matches the original's own toast wording).
    onSaveDraft: function() {
      MessageToast.show(this.getText("draftSaved"));
    },

    onSubmitReport: function() {
      var oContext = this.getView().getBindingContext("rapportsStage");
      var sID = oContext.getProperty("ID");

      var oActionContext = this.bindAction(this.oModel, "/submitRapport", {
        rapportID: sID
      });

      oActionContext.execute().then(function() {
        MessageToast.show(this.getText("reportSubmitted"));
        this.getView().getElementBinding("rapportsStage").refresh();
      }.bind(this)).catch(function(oError) {
        MessageBox.error((oError && oError.message) || this.getText("errorSubmit"));
      }.bind(this));
    }
  });
});
