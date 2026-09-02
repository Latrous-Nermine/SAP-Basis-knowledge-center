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

  // These used to be real routes in THIS app before Lot 2 existed (hence
  // the "Page en cours de développement" stub below), but Lot 2 was
  // actually built into the separate shared shell (app/webapp), not
  // here - clicking these from any page in this app (Rooms/Questions/
  // Tags included) redirects there instead of showing a message about
  // a page that, by now, genuinely exists.
  // 2026-08 polish pass: extended from 4 entries to the shell's full set
  // (app/webapp/controller/App.controller.js's own mRoutes) - this
  // header only ever listed feed/questions/knowledge/rooms/tags/experts/
  // profile, 11 fewer destinations than the shell's header lists for the
  // exact same logged-in user, which is what made the navbar look like
  // it "changes" crossing between the two apps rather than looking like
  // one consistent site.
  var mExternalRoutes = {
    "dashboard": "/webapp/index.html#/dashboard",
    "notifications": "/webapp/index.html#/notifications",
    "knowledge": "/webapp/index.html#/knowledge",
    "experts": "/webapp/index.html#/experts",
    "profile": "/webapp/index.html#/profile",
    "excellenceCenter": "/webapp/index.html#/excellenceCenter",
    "rewards": "/webapp/index.html#/rewards",
    "certifications": "/webapp/index.html#/certifications",
    "admin": "/webapp/index.html#/admin",
    "depot": "/webapp/index.html#/depot",
    "hr": "/webapp/index.html#/hr",
    "reports": "/webapp/index.html#/reports",
    "rapportsStage": "/webapp/index.html#/rapportsStage",
    "validation": "/webapp/index.html#/validation",
    "basisAcademy": "/webapp/index.html#/basisAcademy"
  };

  // Same permission matrix as the shell (app/webapp/controller/
  // App.controller.js#HIDDEN_FOR_ROLE) - both headers must agree on what
  // a given role can see, or the nav visibly differs depending on which
  // of the two apps you happen to be standing in.
  var HIDDEN_FOR_ROLE = {
    Employee: ["hr", "rapportsStage", "depot", "validation", "admin"],
    Intern: ["hr", "validation", "admin"],
    Manager: ["admin", "validation"],
    HR: [],
    Administrator: []
  };

  // 2026-09: values renamed from navBtn* to navItem* - these are now
  // MenuItems inside the "Entreprise" group's dropdown (App.view.xml),
  // not top-level Buttons, but .setVisible() works identically on both,
  // so _applyNavVisibility below needed no logic change, only these ids.
  var NAVKEY_TO_BUTTON_ID = {
    hr: "navItemHr",
    rapportsStage: "navItemRapportsStage",
    depot: "navItemDepot",
    validation: "navItemValidation",
    admin: "navItemAdmin"
  };

  return Controller.extend("aymax.feed.controller.App", {

    onInit: function() {
      this._applyNavVisibility();
    },

    // Awaits Component.js's own profile fetch (getCurrentUserLoadedPromise)
    // instead of reading /currentUser/role synchronously here - that read
    // used to always see the JSONModel's initial "Employee" default,
    // since Component.js's async call had not resolved yet at this point
    // in the page lifecycle. Same HIDDEN_FOR_ROLE matrix as the shell
    // (app/webapp/controller/App.controller.js) - both headers must
    // agree on what a given role can see.
    _applyNavVisibility: function() {
      this.getOwnerComponent().getCurrentUserLoadedPromise().then(function() {
        var oViewModel = this.getOwnerComponent().getModel("view");
        var sRole = oViewModel.getProperty("/currentUser/role") || "Employee";
        var aHidden = HIDDEN_FOR_ROLE[sRole] || [];
        Object.keys(NAVKEY_TO_BUTTON_ID).forEach(function(sNavKey) {
          var oButton = this.byId(NAVKEY_TO_BUTTON_ID[sNavKey]);
          if (oButton) oButton.setVisible(aHidden.indexOf(sNavKey) === -1);
        }.bind(this));
      }.bind(this));
    },

    // Shared by onNavTo (Profil, still a plain Button+CustomData below)
    // and the one-handler-per-MenuItem wrappers underneath it - same
    // split rationale as the shared shell's own App.controller.js#_navTo.
    _navTo: function(sKey) {
      if (mExternalRoutes[sKey]) {
        window.location.href = mExternalRoutes[sKey];
        return;
      }
      if (!mRoutes[sKey]) return;
      this.getOwnerComponent().getRouter().navTo(mRoutes[sKey], {}, true);
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
      this._navTo(sKey);
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