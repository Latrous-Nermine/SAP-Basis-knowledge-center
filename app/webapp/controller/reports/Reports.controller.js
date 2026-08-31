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
      // Feed is rendered inside this shell at its own "feed" route
      // (view/feed/Feed.view.xml) - navigate via the router, not a
      // hard page load to the standalone /feed/webapp app.
      this.getRouter().navTo("feed");
    },

    // Pure UI mockup in the original (no export endpoint) - preserved
    // as-is, same as Admin's Settings/Configuration tabs.
    onExport: function() {
      MessageToast.show(this.getText("exportStarted"));
    }
  });
});
