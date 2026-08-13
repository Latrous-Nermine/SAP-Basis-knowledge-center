sap.ui.define([
  "../BaseController",
  "../../model/hr/formatter"
], function(BaseController, formatter) {
  "use strict";

  return BaseController.extend("aymax.hub.controller.hr.HR", {

    formatter: formatter,

    getResourceBundle: function() {
      return this.getOwnerComponent().getModel("i18n-hr").getResourceBundle();
    },

    getViewModel: function() {
      return this.getOwnerComponent().getModel("view-hr");
    },

    onInit: function() {
      formatter.setResourceBundle(this.getResourceBundle());
      this.getViewModel().setProperty("/activeTab", "employes");
      this.getViewModel().setProperty("/activeEmployeeId", null);
    },

    onHomePress: function() {
      window.location.href = "/feed/webapp/index.html";
    },

    onTabSelect: function(oEvent) {
      var sKey = oEvent.getSource().data("tab");
      this.getViewModel().setProperty("/activeTab", sKey);
      this.getViewModel().setProperty("/activeEmployeeId", null);
    },

    /* ──────── EMPLOYEE TABLE ──────── */

    // Employees is a projection on UserProfiles (String userID key),
    // not Riadh's original cuid-keyed Employees entity - "userID" here,
    // not "ID".
    onEmployeePress: function(oEvent) {
      var oContext = oEvent.getSource().getSelectedItem
        ? oEvent.getSource().getSelectedItem().getBindingContext("hr")
        : oEvent.getSource().getBindingContext("hr");
      if (!oContext) return;

      this.getViewModel().setProperty("/activeEmployeeId", oContext.getProperty("userID"));

      var oDetailView = this.byId("detailViewBox");
      if (oDetailView) {
        oDetailView.setBindingContext(oContext, "hr");
      }
    },

    onBackToList: function() {
      this.getViewModel().setProperty("/activeEmployeeId", null);
    }
  });
});
