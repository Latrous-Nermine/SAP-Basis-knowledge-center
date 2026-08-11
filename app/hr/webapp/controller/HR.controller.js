sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/ui/model/json/JSONModel"
], function(Controller, MessageToast, JSONModel) {
  "use strict";

  return Controller.extend("aymax.hr.controller.HR", {

    onInit: function() {
      this.oViewModel = this.getOwnerComponent().getModel("view");
      if (!this.oViewModel) {
        this.oViewModel = new JSONModel();
        this.getView().setModel(this.oViewModel, "view");
      }
      // FIX: without these defaults, all tab VBoxes stay hidden -> blank page
      this.oViewModel.setProperty("/activeTab", "employes");
      this.oViewModel.setProperty("/activeEmployeeId", null);
    },

    /* ──────── TAB NAVIGATION ──────── */

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
      var sKey = oEvent.getParameter("key");
      this.oViewModel.setProperty("/activeTab", sKey);
      this.oViewModel.setProperty("/activeEmployeeId", null);
    },

    /* ──────── EMPLOYEE TABLE ──────── */

    onEmployeePress: function(oEvent) {
      var oContext = oEvent.getSource().getSelectedItem
        ? oEvent.getSource().getSelectedItem().getBindingContext()
        : oEvent.getSource().getBindingContext();
      if (!oContext) return;
      var sId = oContext.getProperty("ID");
      this.oViewModel.setProperty("/activeEmployeeId", sId);

      var oDetailView = this.byId("detailViewBox");
      if (oDetailView) {
        oDetailView.setBindingContext(oContext);
      }
    },

    onBackToList: function() {
      this.oViewModel.setProperty("/activeEmployeeId", null);
    },

    /* ──────── FORMATTERS ──────── */

    formatObjStatusText: function(sStatus) {
      var mMap = {
        "ontrack": "En bonne voie",
        "atrisk": "À risque",
        "done": "Atteint"
      };
      return mMap[sStatus] || sStatus;
    },

    formatObjStatusState: function(sStatus) {
      var mMap = {
        "ontrack": "Success",
        "atrisk": "Warning",
        "done": "Information"
      };
      return mMap[sStatus] || "None";
    },

    formatSkillWidth: function(iPercent) {
      return iPercent + "%";
    }
  });
});