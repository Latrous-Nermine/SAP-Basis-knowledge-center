sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function(Controller, MessageToast) {
  "use strict";

  var mRoutes = {
    "dashboard": "dashboard",
    "feed": "feed",
    "questions": "questions",
    "knowledge": "knowledge",
    "rooms": "rooms",
    "tags": "tags",
    "topics": "topics",
    "experts": "experts",
    "profile": "profile"
  };

  var mRoleLabels = {
    "Administrator": "Administrateur",
    "Manager": "Manager",
    "Employee": "Employé",
    "Intern": "Stagiaire",
    "HR": "RH"
  };

  return Controller.extend("aymax.feed.controller.App", {

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
      var sRouteName = oEvent.getParameter("name");
      this._updateActiveNav(sRouteName);
    },

    _updateActiveNav: function(sActiveKey) {
      var aButtons = this.getView().$().find(".aymaxNavLinks button");
      aButtons.each(function(i, el) {
        var $el = $(el);
        var sKey = $el.attr("data-navKey");
        if (sKey === sActiveKey) {
          $el.addClass("aymaxNavActive");
        } else {
          $el.removeClass("aymaxNavActive");
        }
      });
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

      if (!sKey || !mRoutes[sKey]) return;

      if (sKey === "dashboard" || sKey === "experts" || sKey === "profile" || sKey === "knowledge") {
        MessageToast.show("Page en cours de développement (Lot 2)");
        return;
      }

      this.getOwnerComponent().getRouter().navTo(mRoutes[sKey], {}, true);
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
      var initials = sName ? sName.replace(/[^A-Z]/g, "").substring(0, 2) : "AY";
      return "https://ui-avatars.com/api/?name=" + encodeURIComponent(sName || "AYMAX") + "&background=1E3A8A&color=fff&size=128";
    }
  });
});