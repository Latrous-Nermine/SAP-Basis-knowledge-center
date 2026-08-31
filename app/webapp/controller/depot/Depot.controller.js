sap.ui.define([
  "../BaseController",
  "../../model/depot/formatter",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(BaseController, formatter, MessageToast, MessageBox) {
  "use strict";

  return BaseController.extend("aymax.hub.controller.depot.Depot", {

    formatter: formatter,

    getResourceBundle: function() {
      return this.getOwnerComponent().getModel("i18n-depot").getResourceBundle();
    },

    getViewModel: function() {
      return this.getOwnerComponent().getModel("view-depot");
    },

    onInit: function() {
      this.oModel = this.getOwnerComponent().getModel("depot");
    },

    onHomePress: function() {
      // Feed is rendered inside this shell at its own "feed" route
      // (view/feed/Feed.view.xml) - navigate via the router, not a
      // hard page load to the standalone /feed/webapp app.
      this.getRouter().navTo("feed");
    },

    // The original's file list already bound to the real {/DepotFiles}
    // collection, but onUploadChange only ever pushed into a separate,
    // never-actually-connected local array on the "view" model - a new
    // upload would never appear in the same list the page shows. Fixed
    // by creating a real row against the same collection the list is
    // bound to. There's no binary storage on DepotFiles (metadata only,
    // same pattern Lot 1's own PostDocuments already uses) - fileName/
    // fileSize/fileType come from the real picked File object, which is
    // already more accurate than the original's hardcoded "N/A" size.
    onUploadChange: function(oEvent) {
      var oFile = oEvent.getParameter("files") && oEvent.getParameter("files")[0];
      if (!oFile) return;

      var sType = oFile.name.split(".").pop().toLowerCase();
      var oListBinding = this.oModel.bindList("/DepotFiles");
      var oContext = oListBinding.create({
        name: oFile.name,
        size: formatter.formatFileSize(oFile.size),
        type: sType
      });

      oContext.created().then(function() {
        MessageToast.show(this.getText("fileUploaded", [oFile.name]));
      }.bind(this)).catch(function(oError) {
        MessageBox.error((oError && oError.message) || this.getText("errorUploadFile"));
      }.bind(this));

      this.byId("fileUploader").setValue("");
    },

    onDeleteFile: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("depot");
      var sName = oContext.getProperty("name");

      MessageBox.confirm(this.getText("deleteFileConfirmText", [sName]), {
        title: this.getText("deleteFileConfirmTitle"),
        onClose: function(sAction) {
          if (sAction !== MessageBox.Action.OK) return;

          oContext.delete().then(function() {
            MessageToast.show(this.getText("fileDeleted"));
          }.bind(this)).catch(function(oError) {
            MessageBox.error((oError && oError.message) || this.getText("errorDeleteFile"));
          }.bind(this));
        }.bind(this)
      });
    }
  });
});
