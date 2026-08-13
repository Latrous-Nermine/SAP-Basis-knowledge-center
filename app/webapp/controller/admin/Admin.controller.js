sap.ui.define([
  "../BaseController",
  "../../model/admin/formatter",
  "sap/ui/core/Fragment",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(BaseController, formatter, Fragment, MessageToast, MessageBox) {
  "use strict";

  return BaseController.extend("aymax.hub.controller.admin.Admin", {

    formatter: formatter,

    getResourceBundle: function() {
      return this.getOwnerComponent().getModel("i18n-admin").getResourceBundle();
    },

    getViewModel: function() {
      return this.getOwnerComponent().getModel("view-admin");
    },

    onInit: function() {
      this.oModel = this.getOwnerComponent().getModel("admin");
      // Was Component.js's own initial view model state in the
      // original standalone app - the shared manifest's "view-admin"
      // model is empty by default, so it needs setting explicitly here
      // (same lesson as Excellence Center/Profile earlier in this app).
      this.getViewModel().setProperty("/activeTab", "roles");
    },

    onHomePress: function() {
      window.location.href = "/feed/webapp/index.html";
    },

    onTabSelect: function(oEvent) {
      // CustomData key on each tab Button is "tab" (see Admin.view.xml) -
      // was misread here as "key", which meant every tab click set
      // activeTab to undefined and hid all four tabs' content. Found
      // while wiring HR's own tab buttons using the same pattern.
      var sKey = oEvent.getSource().data("tab");
      this.getViewModel().setProperty("/activeTab", sKey);
    },

    // Settings/Configuration tabs have no backing entity at all, same
    // as the original (pure UI mockup) - preserved as-is, not wired to
    // anything real, since there's nothing real to wire it to.
    onSaveSettings: function() {
      MessageToast.show(this.getText("settingsSaved"));
    },

    onAddRole: function() {
      this.getViewModel().setProperty("/newRole", { name: "", desc: "" });
      if (!this._pAddRoleDialog) {
        this._pAddRoleDialog = Fragment.load({
          id: this.getView().getId(),
          name: "aymax.hub.view.admin.AddRoleDialog",
          controller: this
        }).then(function(oDialog) {
          this.getView().addDependent(oDialog);
          return oDialog;
        }.bind(this));
      }
      this._pAddRoleDialog.then(function(oDialog) { oDialog.open(); });
    },

    onCancelAddRole: function() {
      this._pAddRoleDialog.then(function(oDialog) { oDialog.close(); });
    },

    onConfirmAddRole: function() {
      var oNewRole = this.getViewModel().getProperty("/newRole");
      var oListBinding = this.oModel.bindList("/Roles");
      var oContext = oListBinding.create({
        name: oNewRole.name,
        desc: oNewRole.desc,
        count: 0
      });

      oContext.created().then(function() {
        MessageToast.show(this.getText("roleCreated"));
        this._pAddRoleDialog.then(function(oDialog) { oDialog.close(); });
      }.bind(this)).catch(function(oError) {
        MessageBox.error((oError && oError.message) || this.getText("errorSaveRole"));
      }.bind(this));
    },

    onEditRole: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("admin");
      if (!this._pEditRoleDialog) {
        this._pEditRoleDialog = Fragment.load({
          id: this.getView().getId(),
          name: "aymax.hub.view.admin.EditRoleDialog",
          controller: this
        }).then(function(oDialog) {
          this.getView().addDependent(oDialog);
          return oDialog;
        }.bind(this));
      }
      this._pEditRoleDialog.then(function(oDialog) {
        oDialog.setBindingContext(oContext, "admin");
        oDialog.open();
      });
    },

    // The dialog's Inputs are two-way bound directly to the row's own
    // context (fewer moving parts than the original's manual
    // read-values-on-save), so Cancel has to explicitly discard
    // whatever was typed - otherwise a cancelled edit would still be
    // sitting as a pending change against the model.
    onCancelEditRole: function() {
      this.oModel.resetChanges();
      this._pEditRoleDialog.then(function(oDialog) { oDialog.close(); });
    },

    onConfirmEditRole: function() {
      this.oModel.submitBatch("$auto").then(function() {
        MessageToast.show(this.getText("roleUpdated"));
        this._pEditRoleDialog.then(function(oDialog) { oDialog.close(); });
      }.bind(this)).catch(function(oError) {
        MessageBox.error((oError && oError.message) || this.getText("errorSaveRole"));
      }.bind(this));
    }
  });
});
