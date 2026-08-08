sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function(Controller, MessageToast) {
  "use strict";

  return Controller.extend("aymax.admin.controller.Admin", {
    onInit: function() {
      this.oViewModel = this.getOwnerComponent().getModel("view");
    },

    onNavToApp: function(oEvent) {
      var sTarget = oEvent.getSource().data("targetApp");
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

    onTabSelect: function(oEvent) {
      var sKey = oEvent.getSource().data("key");
      this.oViewModel.setProperty("/activeTab", sKey);
    },

    onSaveSettings: function() {
      MessageToast.show("Paramètres enregistrés avec succès.");
    },

    onAddRole: function() {
      MessageToast.show("Ouverture du formulaire de création de rôle...");
    },

    onEditRole: function() {
      MessageToast.show("Ouverture de l'éditeur de rôle...");
    },

    /* ── Formatters ── */

    formatPermIcon: function(sVal) {
      return sVal === "✓" ? "sap-icon://accept" : "sap-icon://less";
    },

    formatPermColor: function(sVal) {
      return sVal === "✓" ? "#16a34a" : "#b7c1d6";
    },

    formatRoleInitials: function(sName) {
      if (!sName) return "?";
      var words = sName.split(" ");
      if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
      return sName.substring(0, 2).toUpperCase();
    }
  });
});
