sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function(Controller, MessageToast) {
  "use strict";

  var mRoutes = {
    "feed": "feed",
    "questions": "questions",
    "rooms": "rooms",
    "tags": "tags",
    "topics": "topics"
  };

  // These four used to be real routes in THIS app before Lot 2 existed
  // (hence the "Page en cours de développement" stub below), but Lot 2
  // was actually built into the separate shared shell (app/webapp), not
  // here - clicking these from any page in this app (Rooms/Questions/
  // Tags included) redirects there instead of showing a message about
  // a page that, by now, genuinely exists.
  var mExternalRoutes = {
    "dashboard": "/webapp/index.html#/dashboard",
    "knowledge": "/webapp/index.html#/knowledge",
    "experts": "/webapp/index.html#/experts",
    "profile": "/webapp/index.html#/profile"
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

      if (!sKey) return;

      if (mExternalRoutes[sKey]) {
        window.location.href = mExternalRoutes[sKey];
        return;
      }

      if (!mRoutes[sKey]) return;
      this.getOwnerComponent().getRouter().navTo(mRoutes[sKey], {}, true);
    },

    // Notifications live entirely in the shared shell (app/webapp), not
    // here - same cross-app redirect pattern as mExternalRoutes above.
    // The bell had no press handler at all before this fix (confirmed
    // live: clicking it did nothing - no nav, no toast, no popover).
    onNotificationsPress: function() {
      window.location.href = "/webapp/index.html#/notifications";
    },

    // tokens.css's dark-mode overrides for every --aymax-* custom
    // property are scoped to `[data-theme="sap_horizon_dark"]`, but
    // nothing ever set that attribute - applyTheme() only re-themes
    // native UI5 controls. Every custom aymax* class (cards, meta text,
    // comment composer...) was silently stuck on light-mode colors while
    // native UI5 chrome went dark, which is exactly the half-broken
    // look reported live (white card backgrounds, near-invisible dark
    // text on dark backgrounds).
    onToggleTheme: function() {
      var sCurrentTheme = sap.ui.getCore().getConfiguration().getTheme();
      var sNewTheme = sCurrentTheme === "sap_horizon" ? "sap_horizon_dark" : "sap_horizon";
      sap.ui.getCore().applyTheme(sNewTheme);
      document.documentElement.setAttribute("data-theme", sNewTheme);
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