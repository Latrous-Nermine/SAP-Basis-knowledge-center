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
    "profile": "profile",
    "excellenceCenter": "excellenceCenter"
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

      // Lot 2 modules now live in the shared app/webapp (migrated off their
      // former standalone apps) - still a full navigation, not
      // router.navTo, since Feed itself remains its own separate app under
      // this shell's own router.
      if (sKey === "knowledge") {
        window.location.href = "/webapp/index.html#/knowledge";
        return;
      }

      if (sKey === "experts") {
        window.location.href = "/webapp/index.html#/experts";
        return;
      }

      if (sKey === "profile") {
        this._navigateToOwnProfile();
        return;
      }

      if (sKey === "dashboard") {
        window.location.href = "/webapp/index.html#/dashboard";
        return;
      }

      if (sKey === "excellenceCenter") {
        window.location.href = "/webapp/index.html#/excellence-center";
        return;
      }

      this.getOwnerComponent().getRouter().navTo(mRoutes[sKey], {}, true);
    },

    // Navigates bare, no userID resolved here - same approach the shared
    // app's own navbar "Profil" link uses. Profile.controller.js's own
    // _onRouteMatched resolves "who am I" via PeopleService's
    // getMyUserID(), which is what's actually authenticated; resolving it
    // here first via FeedService's getCurrentUserProfile() was the source
    // of the "impossible d'ouvrir" bug (that function has no @restrict, so
    // it silently answers for whichever identity happens to be cached -
    // or none - instead of the one PeopleService actually knows).
    _navigateToOwnProfile: function() {
      window.location.href = "/webapp/index.html#/profile";
    },

    onNotificationsPress: function() {
      window.location.href = "/webapp/index.html#/notifications";
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
