sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function(Controller, MessageToast) {
  "use strict";

  return Controller.extend("aymax.hr.controller.HR", {

    onInit: function() {
      this.oViewModel = this.getOwnerComponent().getModel("view");
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
      var oContext = oEvent.getSource().getBindingContext("view");
      var sId = oContext.getProperty("id");
      this.oViewModel.setProperty("/activeEmployeeId", sId);
      this.oViewModel.setProperty("/activeEmployee", oContext.getObject());
    },

    onBackToList: function() {
      this.oViewModel.setProperty("/activeEmployeeId", null);
      this.oViewModel.setProperty("/activeEmployee", null);
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
    },

    formatSelectedEmployee: function(sId) {
      if (!sId) return null;
      var aEmployees = this.oViewModel.getProperty("/employees");
      return aEmployees.find(function(e) { return e.id === sId; }) || null;
    },

    isEmployeesTab: function(sTab) {
      return sTab === "employes";
    },
    isCompetencesTab: function(sTab) {
      return sTab === "competences";
    },
    isObjectifsTab: function(sTab) {
      return sTab === "objectifs";
    },
    hasActiveEmployee: function(sId) {
      return !!sId;
    },
    hasNoActiveEmployee: function(sId) {
      return !sId;
    }
  });
});
