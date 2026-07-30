sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function(Controller, MessageToast) {
  "use strict";

  var mRoleLabels = {
    "Admin": "Administrateur",
    "Manager": "Manager",
    "Employee": "Employé",
    "Intern": "Stagiaire",
    "HR": "RH"
  };

  return Controller.extend("aymax.certifications.controller.App", {
    onInit: function() {
      var oRouter = this.getOwnerComponent().getRouter();
      oRouter.attachRouteMatched(this._onRouteMatched, this);
      this._loadUserRole();
    },

    _loadUserRole: function() {
      var oViewModel = this.getOwnerComponent().getModel("view");
      var sRole = oViewModel.getProperty("/currentUser/role") || "Employee";
      oViewModel.setProperty("/userRole", mRoleLabels[sRole] || sRole);
    },

    _onRouteMatched: function(oEvent) {
      // Pour Certifications, pas d'onglet actif dans le header
    },

    onNavTo: function(oEvent) {
      var oButton = oEvent.getSource();
      var aCustomData = oButton.getCustomData();
      var sKey = null;
      
      for (var i = 0; i < aCustomData.length; i++) {
        if (aCustomData[i].getKey() === "navKey") {
          sKey = aCustomData[i].getValue();
          break;
        }
      }

      if (!sKey) return;

      if (sap.ushell && sap.ushell.Container) {
        sap.ushell.Container.getServiceAsync("CrossApplicationNavigation").then(function (oCrossAppNav) {
          oCrossAppNav.toExternal({
            target: { semanticObject: sKey, action: "display" }
          });
        });
      } else {
        window.location.href = "/" + sKey + "/webapp/index.html";
      }
    },

    onToggleTheme: function() {
      var sCurrentTheme = sap.ui.getCore().getConfiguration().getTheme();
      var sNewTheme = sCurrentTheme === "sap_horizon" ? "sap_horizon_dark" : "sap_horizon";
      sap.ui.getCore().applyTheme(sNewTheme);
    },

    onGlobalSearch: function(oEvent) {
      var sQuery = oEvent.getParameter("query");
      if (sQuery) MessageToast.show("Recherche : " + sQuery);
    },

    formatAvatar: function(sUrl, sName) {
      if (sUrl && sUrl !== "null" && sUrl !== "") return sUrl;
      var initials = sName ? sName.replace(/[^A-Z]/g, "").substring(0, 2) : "YM";
      return "https://ui-avatars.com/api/?name=" + encodeURIComponent(sName || "YM") + "&background=1E3A8A&color=fff&size=128";
    }
  });
});
