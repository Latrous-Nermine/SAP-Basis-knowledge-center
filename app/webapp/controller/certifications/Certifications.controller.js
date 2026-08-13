sap.ui.define([
  "../BaseController",
  "../../model/certifications/formatter",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(BaseController, formatter, MessageToast, MessageBox) {
  "use strict";

  return BaseController.extend("aymax.hub.controller.certifications.Certifications", {

    formatter: formatter,

    getResourceBundle: function() {
      return this.getOwnerComponent().getModel("i18n-certifications").getResourceBundle();
    },

    getViewModel: function() {
      return this.getOwnerComponent().getModel("view-certifications");
    },

    onInit: function() {
      this.oModel = this.getOwnerComponent().getModel("certifications");
    },

    onHomePress: function() {
      window.location.href = "/feed/webapp/index.html";
    },

    // Real now (unlike the original's raw property PATCH, which can't
    // work here at all - see certifications-service.cds's own comment:
    // Earned/InProgress/Recommended are CDS views, not updatable
    // through OData). Same visible button/behavior, more robust
    // plumbing underneath.
    onStartCertification: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("certifications");
      var sID = oContext.getProperty("ID");
      var sName = oContext.getProperty("certification").name;

      var oActionContext = this.oModel.bindContext("/startCertification")({
        userCertificationID: sID
      });

      oActionContext.execute().then(function() {
        MessageToast.show(this.getText("certificationStarted", [sName]));
        this.byId("earnedList").getBinding("items").refresh();
        this.byId("inProgressList").getBinding("items").refresh();
        this.byId("recommendedList").getBinding("items").refresh();
      }.bind(this)).catch(function(oError) {
        MessageBox.error((oError && oError.message) || this.getText("errorStartCertification"));
      }.bind(this));
    },

    // Both toast-only in the original (no real form/viewer built) -
    // preserved as-is.
    onViewCertificate: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("certifications");
      var sName = oContext ? oContext.getProperty("certification").name : "";
      MessageToast.show("Ouverture du certificat : " + sName);
    },

    onContinueCertification: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("certifications");
      var sName = oContext ? oContext.getProperty("certification").name : "";
      MessageToast.show("Reprise de la formation : " + sName);
    }
  });
});
