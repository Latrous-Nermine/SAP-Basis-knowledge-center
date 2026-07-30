sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(Controller, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("aymax.depot.controller.Depot", {

    onInit: function() {
      this.oViewModel = this.getOwnerComponent().getModel("view");
    },

    onNavToApp: function(oEvent) {
      // In a Menu item, oEvent.getSource() or oEvent.getParameter("item") might be needed, but if press is on MenuItem, getSource works.
      var oItem = oEvent.getSource ? oEvent.getSource() : oEvent.getParameter("item");
      var sTarget = oItem.data("targetApp");
      if (!sTarget) return;

      if (sap.ushell && sap.ushell.Container) {
        sap.ushell.Container.getServiceAsync("CrossApplicationNavigation").then(function (oCrossAppNav) {
          oCrossAppNav.toExternal({
            target: { semanticObject: sTarget, action: "display" }
          });
        });
      } else {
        window.location.href = "/" + sTarget + "/webapp/index.html";
      }
    },


    onUploadChange: function(oEvent) {
      var oFileUploader = oEvent.getSource();
      var sFileName = oFileUploader.getValue();
      if (!sFileName) return;

      var aFiles = this.oViewModel.getProperty("/files");
      aFiles.unshift({
        name: sFileName,
        size: "N/A", // Simulation
        type: sFileName.split('.').pop().toLowerCase(),
        date: "À l'instant"
      });

      this.oViewModel.setProperty("/files", aFiles);
      MessageToast.show("Fichier '" + sFileName + "' ajouté à la liste.");
      
      // Reset
      oFileUploader.setValue("");
    },

    onDeleteFile: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("view");
      var sPath = oContext.getPath();
      var aFiles = this.oViewModel.getProperty("/files");
      var sIndex = sPath.split("/").pop();

      aFiles.splice(sIndex, 1);
      this.oViewModel.setProperty("/files", aFiles);

      MessageToast.show("Fichier supprimé.");
    },

    formatIcon: function(sType) {
      var mMap = {
        "pdf": "sap-icon://pdf-attachment",
        "zip": "sap-icon://attachment-zip-file",
        "doc": "sap-icon://doc-attachment",
        "docx": "sap-icon://doc-attachment",
        "png": "sap-icon://attachment-photo",
        "jpg": "sap-icon://attachment-photo"
      };
      return mMap[sType] || "sap-icon://attachment";
    }
  });
});
