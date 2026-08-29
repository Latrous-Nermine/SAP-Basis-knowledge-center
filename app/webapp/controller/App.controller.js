sap.ui.define([
  "./BaseController",
  "../model/devRole",
  "../model/shared/avatarSrc",
  "sap/m/MessageToast",
  "sap/m/Menu",
  "sap/m/MenuItem"
], function(BaseController, devRole, avatarSrcUtil, MessageToast, Menu, MenuItem) {
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
    "basisAcademy": "basisAcademy",
    "feed": "feed"
  };

  // Rooms/Questions/Tags live entirely in the standalone Lot 1 app
  // (app/feed/webapp), not as routes in this shell's own Component - same
  // pattern Feed's own sidebar shortcuts already use
  // (Feed.controller.js#onNavToRooms/onNavToTags).
  var mExternalRoutes = {
    "rooms": "/feed/webapp/index.html#/rooms",
    "questions": "/feed/webapp/index.html#/questions",
    "tags": "/feed/webapp/index.html#/tags"
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
  // Manager (2026-08): "Validation" moved into the Knowledge Center page
  // itself (a "Contenu à valider" section, KnowledgeList.view.xml) rather
  // than staying a separate navbar destination, since for a Manager it's
  // the same content their team's Knowledge Center submissions already
  // live next to - explicit request. HR/Administrator keep the standalone
  // page: their relationship to Validation is broader oversight, not
  // scoped to their own Knowledge Center browsing.
  var HIDDEN_FOR_ROLE = {
    Employee: ["hr", "rapportsStage", "depot", "validation", "admin"],
    Intern: ["hr", "validation", "admin"],
    Manager: ["admin", "validation"],
    HR: [],
    Administrator: []
  };

  // navKey -> MenuItem id, for the same five gated modules above (all now
  // live inside the Company MenuButton's dropdown, see App.view.xml).
  var NAVKEY_TO_ITEM_ID = {
    hr: "navItemHr",
    rapportsStage: "navItemRapportsStage",
    depot: "navItemDepot",
    validation: "navItemValidation",
    admin: "navItemAdmin"
  };

  // route name -> top-level nav group control id (2026-08 navbar redesign).
  // Drives _updateActiveNav: the whole group button is highlighted, not a
  // single link, since individual pages now live inside a dropdown rather
  // than each having their own always-visible nav element. Search has no
  // group (never had a nav entry either).
  var ROUTE_TO_NAV_GROUP = {
    dashboard: "navGroupAccueil",
    feed: "navGroupAccueil",
    knowledgeList: "navGroupKnowledge",
    knowledgeDetail: "navGroupKnowledge",
    expertsList: "navGroupKnowledge",
    basisAcademy: "navGroupLearning",
    certifications: "navGroupLearning",
    excellenceCenter: "navGroupCompany",
    rewards: "navGroupCompany",
    hr: "navGroupCompany",
    depot: "navGroupCompany",
    rapportsStage: "navGroupCompany",
    reports: "navGroupCompany",
    validation: "navGroupCompany",
    admin: "navGroupCompany"
  };
  var ALL_NAV_GROUP_IDS = ["navGroupAccueil", "navGroupKnowledge", "navGroupLearning", "navGroupCompany"];

  // "Sami Ben Youssef" -> "SB" - same first+second-word rule every other
  // avatar-initials formatter in this app uses (e.g. model/knowledge/
  // formatter.js#initialsFromName); inlined here rather than pulled in as
  // a shared module for one three-line function used by a single control.
  function initialsFromName(sName) {
    if (!sName) return "?";
    var aParts = sName.trim().split(/\s+/);
    var sFirst = aParts[0] ? aParts[0].charAt(0) : "";
    var sSecond = aParts.length > 1 ? aParts[1].charAt(0) : "";
    return (sFirst + sSecond).toUpperCase() || "?";
  }

  return BaseController.extend("aymax.hub.controller.App", {

    onInit: function() {
      this.getRouter().attachRouteMatched(this._onRouteMatched, this);
      this.byId("devRoleSelect").setSelectedKey(devRole.getStoredRole());
      this._applyNavVisibility();
      this._loadMyProfile();
    },

    // Account menu avatar (2026-08 navbar redesign) - reads the same
    // MyProfile projection (srv/people-service.cds, scoped to the caller's
    // own row) Profile.controller.js already uses for avatar/cover upload;
    // nothing new on the backend. bindList + requestContexts(0, 1) is the
    // same proven mechanism KnowledgeList.controller.js#_loadTopics already
    // uses to read a small reference list once at startup - MyProfile has
    // no "get my own row directly" shortcut of its own, so this reads its
    // one-row collection instead of a single bindContext (there's no key
    // known client-side to address it by before this call resolves).
    _loadMyProfile: function() {
      var oPeopleModel = this.getOwnerComponent().getModel("people");
      oPeopleModel.bindList("/MyProfile").requestContexts(0, 1).then(function(aContexts) {
        if (!aContexts.length) return;
        var oProfile = aContexts[0].getObject();
        this.getViewModel().setProperty("/myProfile", {
          avatarSrc: avatarSrcUtil.avatarSrc(oProfile.userID, oProfile.avatarMimeType),
          initials: initialsFromName(oProfile.displayName),
          color: "Accent6"
        });
      }.bind(this)).catch(function() {
        // No identity resolved - the avatar just shows its own placeholder
        // initials fallback ("?"), same fail-open-on-a-UI-hint tradeoff as
        // every other best-effort read in this app.
      });
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
        Object.keys(NAVKEY_TO_ITEM_ID).forEach(function(sNavKey) {
          var oItem = this.byId(NAVKEY_TO_ITEM_ID[sNavKey]);
          if (oItem) oItem.setVisible(aHidden.indexOf(sNavKey) === -1);
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
      var oBell = this.byId("navBtnNotificationBell");
      if (oBell) oBell.setVisible(sRouteName !== "notifications");
    },

    // Same theme-toggle pattern as the standalone Lot 1 app
    // (app/feed/webapp/controller/App.controller.js#onToggleTheme) -
    // this shell had no theme toggle at all before this fix, even
    // though css/lot3/tokens.css already defines a full dark palette
    // under [data-theme="sap_horizon_dark"] - nothing ever set that
    // attribute, so it was permanently unreachable here.
    onToggleTheme: function() {
      var sCurrentTheme = sap.ui.getCore().getConfiguration().getTheme();
      var sNewTheme = sCurrentTheme === "sap_horizon" ? "sap_horizon_dark" : "sap_horizon";
      sap.ui.getCore().applyTheme(sNewTheme);
      document.documentElement.setAttribute("data-theme", sNewTheme);
    },

    onNotificationsBellPress: function() {
      this.getRouter().navTo("notifications");
    },

    onHeaderSearch: function(oEvent) {
      var sQuery = (oEvent.getParameter("query") || "").trim();
      if (!sQuery) return;
      // Not router.navTo(..., {"?query": {q: sQuery}}) - confirmed live
      // that UI5's own query-parameter object serialization double-
      // encodes the value (a space came back as %2520, i.e. "%20"
      // encoded a second time). Building the hash directly sidesteps
      // it; the router still picks up the resulting hashchange and
      // fires pattern-matched exactly as navTo would.
      window.location.hash = "#/search?q=" + encodeURIComponent(sQuery);
    },

    // Highlights the whole nav GROUP the active route belongs to (2026-08
    // navbar redesign) - imperative addStyleClass/removeStyleClass on the
    // real control objects (toggleStyleClass wraps exactly that), never a
    // bound class= (this app has repeatedly confirmed a class= binding -
    // ternary AND formatter-based - silently never applies). Replaces the
    // old DOM data-navkey lookup, which never actually worked in the first
    // place: the CustomData it read was never written to the DOM
    // (writeToDom="true" was never set), and couldn't have survived this
    // redesign unchanged regardless once individual links moved into
    // MenuButton dropdowns.
    _updateActiveNav: function(sActiveRoute) {
      var sActiveGroupId = ROUTE_TO_NAV_GROUP[sActiveRoute];
      ALL_NAV_GROUP_IDS.forEach(function(sGroupId) {
        var oControl = this.byId(sGroupId);
        if (oControl) oControl.toggleStyleClass("aymaxNavActive", sGroupId === sActiveGroupId);
      }.bind(this));
    },

    // One shared navigation helper (CLAUDE.md §10: no duplicated logic),
    // called by every onNavX wrapper below instead of each one re-checking
    // mExternalRoutes/mRoutes on its own. Individual wrappers exist (rather
    // than one handler reading a key off the source control) because
    // sap.m.MenuItem has no "key" property in this UI5 version (confirmed
    // against the actual 1.120.0 source, not assumed) and core:CustomData
    // bare-nested inside a layout control's default aggregation has
    // already been confirmed to throw elsewhere in this app - the same
    // one-handler-per-item shape KnowledgeList's category picker tiles
    // already use, for the same reason.
    _navTo: function(sKey) {
      if (mExternalRoutes[sKey]) {
        window.location.href = mExternalRoutes[sKey];
        return;
      }
      if (!mRoutes[sKey]) return;
      this.getRouter().navTo(mRoutes[sKey]);
    },

    onNavDashboard: function() { this._navTo("dashboard"); },
    onNavFeed: function() { this._navTo("feed"); },
    onNavKnowledge: function() { this._navTo("knowledge"); },
    onNavQuestions: function() { this._navTo("questions"); },
    onNavExperts: function() { this._navTo("experts"); },
    onNavTags: function() { this._navTo("tags"); },
    onNavRooms: function() { this._navTo("rooms"); },
    onNavBasisAcademy: function() { this._navTo("basisAcademy"); },
    onNavCertifications: function() { this._navTo("certifications"); },
    onNavExcellenceCenter: function() { this._navTo("excellenceCenter"); },
    onNavRewards: function() { this._navTo("rewards"); },
    onNavHR: function() { this._navTo("hr"); },
    onNavDepot: function() { this._navTo("depot"); },
    onNavRapportsStage: function() { this._navTo("rapportsStage"); },
    onNavReports: function() { this._navTo("reports"); },
    onNavValidation: function() { this._navTo("validation"); },
    onNavAdmin: function() { this._navTo("admin"); },

    // "Profil" always navigates bare (no userID) - Profile.controller.js's
    // own _onRouteMatched already resolves that to the caller's own profile
    // via getMyUserID(), so there's no need to duplicate that lookup here.
    onNavProfile: function() { this._navTo("profile"); },

    // Account menu (2026-08 navbar redesign) - a plain Menu opened via
    // Menu#openBy anchored to the avatar that was pressed, not a
    // MenuButton (MenuButton's own "icon" property only accepts an icon
    // URI string, it can't show a real uploaded photo). Built once, lazily,
    // same pattern this app already uses for its heavier Fragment-based
    // dialogs (e.g. KnowledgeList.controller.js#onContribute).
    onProfileMenuPress: function(oEvent) {
      if (!this._oProfileMenu) {
        this._oProfileMenu = new Menu({
          items: [
            new MenuItem({ text: this.getText("navProfile"), icon: "sap-icon://person-placeholder", press: this.onNavProfile.bind(this) })
          ]
        });
        this.getView().addDependent(this._oProfileMenu);
      }
      this._oProfileMenu.openBy(oEvent.getSource());
    }
  });
});
