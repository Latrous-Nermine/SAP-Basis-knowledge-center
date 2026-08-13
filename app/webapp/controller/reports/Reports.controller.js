sap.ui.define([
  "../BaseController",
  "../../model/reports/formatter",
  "sap/m/MessageToast"
], function(BaseController, formatter, MessageToast) {
  "use strict";

  return BaseController.extend("aymax.hub.controller.reports.Reports", {

    formatter: formatter,

    getResourceBundle: function() {
      return this.getOwnerComponent().getModel("i18n-reports").getResourceBundle();
    },

    getViewModel: function() {
      return this.getOwnerComponent().getModel("view-reports");
    },

    onInit: function() {
      formatter.setResourceBundle(this.getResourceBundle());
    },

    onHomePress: function() {
      window.location.href = "/feed/webapp/index.html";
    },

    // Pure UI mockup in the original (no export endpoint) - preserved
    // as-is, same as Admin's Settings/Configuration tabs.
    onExport: function() {
      MessageToast.show(this.getText("exportStarted"));
    }
  });
});
