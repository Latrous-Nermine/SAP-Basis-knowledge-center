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
    "Admin": "Administrateur",
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

      // Lot 2 modules that exist today are standalone apps (their own
      // Component.js/router), not routes inside this shared shell yet
      // (docs/lot2-analysis.md §6.3 - one-app-vs-many is still open) -
      // full navigation, not router.navTo, until that's resolved.
      if (sKey === "knowledge") {
        window.location.href = "/knowledge/webapp/index.html";
        return;
      }

      if (sKey === "experts") {
        window.location.href = "/experts/webapp/index.html";
        return;
      }

      if (sKey === "profile") {
        this._navigateToOwnProfile();
        return;
      }

      if (sKey === "dashboard") {
        window.location.href = "/dashboard/webapp/index.html";
        return;
      }

      this.getOwnerComponent().getRouter().navTo(mRoutes[sKey], {}, true);
    },

    // currentUser.userID (view model) is only populated once
    // Component.js#_loadCurrentUser()'s async call resolves. Clicking
    // "Profil" before that finished - or after it silently failed - used
    // to just do nothing. The cached value is still used when it's already
    // there (fast path, no behaviour change); otherwise this re-fetches
    // live instead of leaving the click a no-op, and surfaces a real error
    // if that fetch fails too.
    _navigateToOwnProfile: function() {
      var oViewModel = this.getOwnerComponent().getModel("view");
      var sUserID = oViewModel.getProperty("/currentUser/userID");

      if (sUserID) {
        window.location.href = "/profile/webapp/index.html#/profile/" + encodeURIComponent(sUserID);
        return;
      }

      var oContext = this.getOwnerComponent().getModel().bindContext("/getCurrentUserProfile()");
      oContext.requestObject().then(function(oData) {
        if (oData && oData.userID) {
          window.location.href = "/profile/webapp/index.html#/profile/" + encodeURIComponent(oData.userID);
        } else {
          MessageToast.show("Impossible d'ouvrir le profil pour le moment");
        }
      }).catch(function() {
        MessageToast.show("Impossible d'ouvrir le profil pour le moment");
      });
    },

    onNotificationsPress: function() {
      window.location.href = "/notifications/webapp/index.html";
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
      return "https://ui-avatars.com/api/?name=" + encodeURIComponent(sName || "AYMAX") + "&background=1E3A8A&color=fff&size=128";
    }
  });
});
