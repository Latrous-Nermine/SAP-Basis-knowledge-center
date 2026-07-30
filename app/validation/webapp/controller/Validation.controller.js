sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function(Controller, MessageToast) {
  "use strict";

  return Controller.extend("aymax.validation.controller.Validation", {
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
      this.oViewModel.setProperty("/filterStatus", sKey);
      this._updateDisplayItems();
    },

    _updateDisplayItems: function() {
      var sFilter = this.oViewModel.getProperty("/filterStatus");
      var aAllItems = this.oViewModel.getProperty("/allItems");
      
      var aFiltered = aAllItems;
      if (sFilter !== "all") {
        aFiltered = aAllItems.filter(function(i) { return i.status === sFilter; });
      }
      this.oViewModel.setProperty("/displayItems", aFiltered);
      
      // Update counts
      this.oViewModel.setProperty("/counts/pending", aAllItems.filter(function(i){ return i.status === "pending"; }).length);
      this.oViewModel.setProperty("/counts/approved", aAllItems.filter(function(i){ return i.status === "approved"; }).length);
      this.oViewModel.setProperty("/counts/rejected", aAllItems.filter(function(i){ return i.status === "rejected"; }).length);
      this.oViewModel.setProperty("/counts/all", aAllItems.length);
    },

    onChangeStatus: function(oEvent, sNewStatus) {
      var oContext = oEvent.getSource().getBindingContext("view");
      var sPath = oContext.getPath();
      var oItem = this.oViewModel.getProperty(sPath);

      var aAllItems = this.oViewModel.getProperty("/allItems");
      for (var i = 0; i < aAllItems.length; i++) {
        if (aAllItems[i].id === oItem.id) {
          aAllItems[i].status = sNewStatus;
          break;
        }
      }
      this.oViewModel.setProperty("/allItems", aAllItems);
      this._updateDisplayItems();

      MessageToast.show("Statut mis à jour : " + sNewStatus);
    },
    
    onApprove: function(oEvent) {
      this.onChangeStatus(oEvent, "approved");
    },
    
    onReject: function(oEvent) {
      this.onChangeStatus(oEvent, "rejected");
    },
    
    onModify: function() {
      MessageToast.show("Ouverture de l'éditeur de contenu...");
    },

    formatStatusState: function(sStatus) {
      if (sStatus === "approved") return "Success";
      if (sStatus === "rejected") return "Error";
      return "Warning";
    },

    formatStatusText: function(sStatus) {
      if (sStatus === "approved") return "Approuvé";
      if (sStatus === "rejected") return "Rejeté";
      return "En attente";
    }
  });
});
