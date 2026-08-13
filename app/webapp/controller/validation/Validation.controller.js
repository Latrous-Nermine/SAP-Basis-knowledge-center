sap.ui.define([
  "../BaseController",
  "../../model/validation/formatter",
  "sap/ui/core/Fragment",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(BaseController, formatter, Fragment, Filter, FilterOperator, MessageToast, MessageBox) {
  "use strict";

  return BaseController.extend("aymax.hub.controller.validation.Validation", {

    formatter: formatter,

    getResourceBundle: function() {
      return this.getOwnerComponent().getModel("i18n-validation").getResourceBundle();
    },

    getViewModel: function() {
      return this.getOwnerComponent().getModel("view-validation");
    },

    onInit: function() {
      formatter.setResourceBundle(this.getResourceBundle());
      this.oModel = this.getOwnerComponent().getModel("validation");
      this.getViewModel().setProperty("/filterStatus", "pending");
      this.getViewModel().setProperty("/counts", { pending: 0, approved: 0, rejected: 0, all: 0 });

      this._loadCounts();
      this._applyListFilter("pending");
    },

    onHomePress: function() {
      window.location.href = "/feed/webapp/index.html";
    },

    // Riadh's original bound a `/ValidationCounts` entity (a manually
    // synced counter table) - replaced server-side with a computed
    // function (see validation-service.cds's own comment), so this
    // calls that function instead of list-binding an entity that no
    // longer exists.
    _loadCounts: function() {
      var oViewModel = this.getViewModel();

      this.oModel.bindContext("/getValidationCounts()").requestObject().then(function(oData) {
        oViewModel.setProperty("/counts", {
          pending: oData.pending || 0,
          approved: oData.approved || 0,
          rejected: oData.rejected || 0,
          all: oData.total || 0
        });
      }).catch(function(oError) {
        // Same as the original: a background stat load, not a user
        // action - a role without ValidationCounts access
        // (@requires Manager/HR/Admin) just keeps the pills
        // at zero rather than an interrupting error dialog.
        console.error("Error loading ValidationCounts:", oError);
      });
    },

    _applyListFilter: function(sKey) {
      var oList = this.byId("validationList");
      if (!oList) return;
      var oBinding = oList.getBinding("items");
      if (!oBinding) return;

      var aFilters = sKey === "all" ? [] : [new Filter("status", FilterOperator.EQ, sKey)];
      oBinding.filter(aFilters);
    },

    onTabSelect: function(oEvent) {
      var sKey = oEvent.getSource().data("tab");
      this.getViewModel().setProperty("/filterStatus", sKey);
      this._applyListFilter(sKey);
    },

    _changeStatus: function(oContext, sNewStatus) {
      oContext.setProperty("status", sNewStatus);
      this.oModel.submitBatch("$auto").then(function() {
        MessageToast.show(this.getText("statusUpdated", [formatter.formatStatusText(sNewStatus)]));
        this._loadCounts();
        this._applyListFilter(this.getViewModel().getProperty("/filterStatus"));
      }.bind(this)).catch(function(oError) {
        MessageBox.error((oError && oError.message) || this.getText("errorUpdateStatus"));
      }.bind(this));
    },

    onApprove: function(oEvent) {
      this._changeStatus(oEvent.getSource().getBindingContext("validation"), "approved");
    },

    onReject: function(oEvent) {
      this._changeStatus(oEvent.getSource().getBindingContext("validation"), "rejected");
    },

    // Converted from the original's raw `new sap.m.Dialog(...)` JS
    // construction to an XML fragment (EditContentDialog.fragment.xml) -
    // this codebase's convention forbids building dialogs in JS (see
    // Admin's AddRoleDialog/EditRoleDialog for the same conversion).
    // The Title/Excerpt fields are two-way bound straight to the row's
    // own context, so Cancel has to explicitly discard whatever was
    // typed, same reasoning as Admin's onCancelEditRole.
    onModify: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("validation");
      if (!this._pEditContentDialog) {
        this._pEditContentDialog = Fragment.load({
          id: this.getView().getId(),
          name: "aymax.hub.view.validation.EditContentDialog",
          controller: this
        }).then(function(oDialog) {
          this.getView().addDependent(oDialog);
          return oDialog;
        }.bind(this));
      }
      this._pEditContentDialog.then(function(oDialog) {
        oDialog.setBindingContext(oContext, "validation");
        oDialog.open();
      });
    },

    onCancelModify: function() {
      this.oModel.resetChanges();
      this._pEditContentDialog.then(function(oDialog) { oDialog.close(); });
    },

    onConfirmModify: function() {
      this.oModel.submitBatch("$auto").then(function() {
        MessageToast.show(this.getText("contentUpdated"));
        this._pEditContentDialog.then(function(oDialog) { oDialog.close(); });
      }.bind(this)).catch(function(oError) {
        MessageBox.error((oError && oError.message) || this.getText("errorUpdateContent"));
      }.bind(this));
    }
  });
});
