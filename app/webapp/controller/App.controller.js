sap.ui.define([
  "./BaseController",
  "../model/devRole",
  "sap/m/MessageToast"
], function(BaseController, devRole, MessageToast) {
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
    "excellenceCenter": "excellenceCenter",
    "rewards": "rewards",
    "certifications": "certifications",
    "admin": "admin",
    "depot": "depot",
    "hr": "hr",
    "reports": "reports",
    "rapportsStage": "rapportsStage",
    "validation": "validation",
    "feed": "feed"
  };

  // Permission matrix (2026-08) - modules with a NONE access level for a
  // given role are hidden from the nav AND unreachable by route (typed
  // URL, bookmark, browser back button) - see _guardRoute. Everything
  // else (FULL/OWN/TEAM/READONLY) stays reachable; the backend @restrict
  // is what actually enforces those, this is just keeping a NONE
  // module fully out of the role's sight, not just off the nav.
  // Keyed by navKey, which is also the route name for every one of
  // these five (mRoutes maps each 1:1) - not true for knowledge/experts,
  // but those are never gated so it doesn't matter here.
  var HIDDEN_FOR_ROLE = {
    Employee: ["hr", "rapportsStage", "depot", "validation", "admin"],
    Intern: ["hr", "validation", "admin"],
    Manager: ["admin"],
    HR: [],
    Administrator: []
  };

  // navKey -> nav Button id, for the same five gated modules above.
  var NAVKEY_TO_BUTTON_ID = {
    hr: "navBtnHr",
    rapportsStage: "navBtnRapportsStage",
    depot: "navBtnDepot",
    validation: "navBtnValidation",
    admin: "navBtnAdmin"
  };

  return BaseController.extend("aymax.hub.controller.App", {

    onInit: function() {
      this.getRouter().attachRouteMatched(this._onRouteMatched, this);
      this.byId("devRoleSelect").setSelectedKey(devRole.getStoredRole());
      this._applyNavVisibility();
    },

    // Resolved once per page load, cached, and reused by both the nav
    // hider and the route guard below - one network call, not two, and
    // both always agree on the same role. Reads it from the server
    // (PeopleService#getMyRole), not from the dev-role dropdown's own
    // stored value directly - that way this reflects the same real,
    // server-resolved role every @restrict check uses, dev-role
    // override included (see srv/server.js), rather than trusting the
    // client's own guess.
    _getRole: function() {
      if (!this._pRole) {
        var oPeopleModel = this.getOwnerComponent().getModel("people");
        this._pRole = oPeopleModel.bindContext("/getMyRole()").requestObject()
          .then(function(oData) { return oData && oData.value; })
          .catch(function(oError) {
            // Background call, not a user action - log it, don't
            // interrupt the page with an error dialog. Nav stays fully
            // visible and no route gets guarded until this resolves -
            // same fail-open-on-the-UI-hint-only tradeoff as everywhere
            // else in this app, since the backend @restrict is the
            // actual gate regardless of what this call does.
            console.error("Error loading current role:", oError);
          });
      }
      return this._pRole;
    },

    // Hides nav links for modules the current role has NONE access to.
    _applyNavVisibility: function() {
      this._getRole().then(function(sRole) {
        var aHidden = HIDDEN_FOR_ROLE[sRole] || [];
        Object.keys(NAVKEY_TO_BUTTON_ID).forEach(function(sNavKey) {
          var oButton = this.byId(NAVKEY_TO_BUTTON_ID[sNavKey]);
          if (oButton) oButton.setVisible(aHidden.indexOf(sNavKey) === -1);
        }.bind(this));
      }.bind(this));
    },

    // Closes the gap a hidden nav button alone leaves open: a typed
    // URL, bookmark, or browser back/forward button still lands
    // directly on a route, bypassing the nav entirely. If the role
    // resolves to NONE for the module just navigated to, bounce back
    // to the dashboard instead of leaving a broken, data-less page
    // rendered (every one of its own OData calls would 403 anyway -
    // this just avoids the flash of an empty page first).
    _guardRoute: function(sRouteName) {
      this._getRole().then(function(sRole) {
        var aHidden = HIDDEN_FOR_ROLE[sRole] || [];
        if (aHidden.indexOf(sRouteName) !== -1) {
          MessageToast.show(this.getText("navAccessDenied"));
          this.getRouter().navTo("dashboard");
        }
      }.bind(this));
    },

    // Dev-only role preview (CLAUDE.md §5 C7 exception) - see
    // model/devRole.js. Reloading is the simplest way to guarantee
    // every already-bound view across every module refetches under
    // the new identity, rather than trying to force-refresh a dozen
    // separate OData models individually.
    onDevRoleChange: function(oEvent) {
      var sRole = oEvent.getParameter("selectedItem").getKey();
      devRole.storeRole(sRole);
      window.location.reload();
    },

    _onRouteMatched: function(oEvent) {
      var sRouteName = oEvent.getParameter("name");
      this._updateActiveNav(sRouteName);
      this._guardRoute(sRouteName);
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
    }
  });
});
