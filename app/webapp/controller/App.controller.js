sap.ui.define([
  "./BaseController"
], function(BaseController) {
  "use strict";

  // navKey (customData on each nav Button) -> actual route name. Most are
  // 1:1; knowledge/experts differ because their route names were disambiguated
  // from Feed's own "knowledge"/"experts" navKeys during the Lot 2 <->
  // Lot 3 route-collision fix (see manifest.json routing).
  var mRoutes = {
    "dashboard": "dashboard",
    "notifications": "notifications",
    "knowledge": "knowledgeList",
    "experts": "expertsList",
    "profile": "profile",
    "excellenceCenter": "excellenceCenter"
  };

  return BaseController.extend("aymax.hub.controller.App", {

    onInit: function() {
      this.getRouter().attachRouteMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function(oEvent) {
      this._updateActiveNav(oEvent.getParameter("name"));
    },

    _updateActiveNav: function(sActiveRoute) {
      var aButtons = this.getView().$().find(".aymaxNavLinks button");
      aButtons.each(function(i, el) {
        var $el = $(el);
        var sKey = $el.attr("data-navkey");
        $el.toggleClass("aymaxNavActive", !!sKey && mRoutes[sKey] === sActiveRoute);
      });
    },

    // "Profil" always navigates bare (no userID) - Profile.controller.js's
    // own _onRouteMatched already resolves that to the caller's own profile
    // via getMyUserID(), so there's no need to duplicate that lookup here.
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
      this.getRouter().navTo(mRoutes[sKey]);
    },

    // Feed remains its own separate app under its own router/Component -
    // a real navigation, not router.navTo, same as every Feed->webapp link.
    onGoToFeed: function() {
      window.location.href = "/feed/webapp/index.html";
    }
  });
});
