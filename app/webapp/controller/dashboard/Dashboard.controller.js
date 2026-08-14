sap.ui.define([
  "../BaseController",
  "../../model/dashboard/formatter",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/core/Fragment",
  "sap/m/MessageBox",
  "sap/m/MessageToast"
], function(BaseController, formatter, Filter, FilterOperator, Fragment, MessageBox, MessageToast) {
  "use strict";

  var TITLE_KEYS = {
    Employee: ["titleEmployee", "subtitleEmployee"],
    Manager: ["titleManager", "subtitleManager"],
    HR: ["titleHR", "subtitleHR"],
    Administrator: ["titleAdmin", "subtitleAdmin"],
    Intern: ["titleIntern", "subtitleIntern"]
  };

  return BaseController.extend("aymax.hub.controller.dashboard.Dashboard", {

    formatter: formatter,

    // Overrides BaseController's getResourceBundle() (which returns the
    // shell's own tiny 2-key i18n bundle) so this.getText()/formatter
    // lookups resolve against this module's real, full bundle instead -
    // missing this was why every KPI label showed its raw i18n key
    // ("kpiTotalScore") instead of translated text.
    getResourceBundle: function() {
      return this.getOwnerComponent().getModel("i18n-dashboard").getResourceBundle();
    },

    // Overrides BaseController's getViewModel() so every existing
    // this.getViewModel() call below keeps working unchanged, now pointed
    // at this module's own named model instead of the shell's shared one.
    getViewModel: function() {
      return this.getOwnerComponent().getModel("view-dashboard");
    },

    onInit: function() {
      formatter.setResourceBundle(this.getResourceBundle());
      // "dashboard" was the unnamed default model in the old standalone
      // app; now named, since one shared Component can only have one true
      // default. people/knowledge/notification/feed were already named
      // exactly this in Dashboard's own original manifest - unchanged.
      this.oModel = this.getOwnerComponent().getModel("dashboard");
      this.oPeopleModel = this.getOwnerComponent().getModel("people");
      this.oKnowledgeModel = this.getOwnerComponent().getModel("knowledge");
      this.oNotificationModel = this.getOwnerComponent().getModel("notification");
      this.oFeedModel = this.getOwnerComponent().getModel("feed");

      this._loadDashboard();
    },

    onRefresh: function() {
      this._loadDashboard();
    },

    onHomePress: function() {
      // Feed is unchanged and unmoved - still a separate app, still
      // reached the same way.
      window.location.href = "/feed/webapp/index.html";
    },

    // ────────────────────────────────────────────────────────────
    // getDashboard() - the one call every role makes. Widgets that read
    // from other services (Notifications/Knowledge/Trending/Experts/own
    // skills+certs) load independently afterwards, only for Employee,
    // and never block this call or each other - see Phase 1/5.
    // ────────────────────────────────────────────────────────────
    _loadDashboard: function() {
      this.getViewModel().setProperty("/busy", true);

      var oContext = this.oModel.bindContext("/getDashboard()");
      return oContext.requestObject().then(function(oData) {
        var aKeys = TITLE_KEYS[oData.role] || TITLE_KEYS.Employee;
        var oBundle = this.getResourceBundle();

        this.getViewModel().setProperty("/role", oData.role);
        this.getViewModel().setProperty("/title", oBundle.getText(aKeys[0]));
        this.getViewModel().setProperty("/subtitle", oBundle.getText(aKeys[1]));
        this.getViewModel().setProperty("/kpis", this._buildKpis(oData));

        if (oData.employee) this.getViewModel().setProperty("/employee", oData.employee);
        if (oData.manager) this.getViewModel().setProperty("/manager", oData.manager);
        if (oData.hr) this.getViewModel().setProperty("/hr", oData.hr);
        if (oData.admin) this.getViewModel().setProperty("/admin", oData.admin);
        if (oData.intern) this.getViewModel().setProperty("/intern", oData.intern);

        if (oData.role === "Employee") {
          this._loadTrendingTopics();
          this._loadSuggestedExperts();
          this._loadOwnSkillsAndCerts();
        }
      }.bind(this)).catch(function() {
        MessageBox.error(this.getText("errorLoadDashboard"));
      }.bind(this)).finally(function() {
        this.getViewModel().setProperty("/busy", false);
      }.bind(this));
    },

    // Every role's KPI row has a different set of scalar fields with
    // different names - this is the one place that difference is
    // resolved, into one uniform {label,value,unit,isFirst} array the
    // XML never has to branch on. Gap-only fields (HR's growthPercent,
    // Admin's activityGrowthPercent) are omitted rather than shown as a
    // blank/zero tile - a "0" would read as real data, not "not tracked
    // yet". Same reasoning drives Intern getting no KPI row at all: all
    // 4 of its fields are gaps (TODO-INTEGRATION.md I-09).
    _buildKpis: function(oData) {
      var oBundle = this.getResourceBundle();
      var sUnit = oBundle.getText("kpiPointsUnit");

      switch (oData.role) {
        case "Employee": {
          var e = oData.employee;
          return [
            { label: oBundle.getText("kpiTotalScore"), value: e.totalScore, unit: sUnit, isFirst: true, icon: "sap-icon://money" },
            { label: oBundle.getText("kpiBadges"), value: e.badgePoints, unit: sUnit, isFirst: false, icon: "sap-icon://favorite" },
            { label: oBundle.getText("kpiPublications"), value: e.publicationPoints, unit: sUnit, isFirst: false, icon: "sap-icon://document-text" },
            { label: oBundle.getText("kpiContributions"), value: e.contributionPoints, unit: sUnit, isFirst: false, icon: "sap-icon://group" }
          ];
        }
        case "Manager": {
          var m = oData.manager;
          return [
            { label: oBundle.getText("teamActiveEmployees"), value: m.activeEmployees, unit: "", isFirst: true, icon: "sap-icon://group" },
            { label: oBundle.getText("teamContributions"), value: m.contributions, unit: "", isFirst: false, icon: "sap-icon://document-text" },
            { label: oBundle.getText("teamPendingValidations"), value: m.pendingValidations, unit: "", isFirst: false, icon: "sap-icon://activity-items" },
            { label: oBundle.getText("teamTopContributor"), value: m.topContributor, unit: "", isFirst: false, icon: "sap-icon://person-placeholder" }
          ];
        }
        case "HR": {
          var h = oData.hr;
          return [
            { label: oBundle.getText("hrTotalEmployees"), value: h.totalEmployees, unit: "", isFirst: true, icon: "sap-icon://group" },
            { label: oBundle.getText("hrActiveEmployees"), value: h.activeEmployees, unit: "", isFirst: false, icon: "sap-icon://activity-items" },
            { label: oBundle.getText("hrAverageLevel"), value: h.averageLevel, unit: "", isFirst: false, icon: "sap-icon://favorite" }
          ];
        }
        case "Administrator": {
          var a = oData.admin;
          return [
            { label: oBundle.getText("adminTotalUsers"), value: a.totalUsers, unit: "", isFirst: true, icon: "sap-icon://group" },
            { label: oBundle.getText("adminActiveUsers"), value: a.activeUsers, unit: "", isFirst: false, icon: "sap-icon://activity-items" },
            { label: oBundle.getText("adminRolesConfigured"), value: a.rolesConfigured, unit: "", isFirst: false, icon: "sap-icon://key-user-settings" }
          ];
        }
        default:
          return [];
      }
    },

    // ────────────────────────────────────────────────────────────
    // Employee-only independent widgets - each its own call, each its
    // own try/catch, so one failing (e.g. Notifications being briefly
    // down) never blocks or blanks the rest of the page.
    // ────────────────────────────────────────────────────────────

    _loadTrendingTopics: function() {
      this.oFeedModel.bindContext("/getTrendingTags()").requestObject().then(function(oData) {
        this.getViewModel().setProperty("/trendingTopics", (oData && oData.value) || []);
      }.bind(this)).catch(function() {
        this.getViewModel().setProperty("/trendingTopics", []);
      }.bind(this));
    },

    _loadSuggestedExperts: function() {
      this.oFeedModel.bindContext("/getSuggestedExperts()").requestObject().then(function(oData) {
        this.getViewModel().setProperty("/suggestedExperts", (oData && oData.value) || []);
      }.bind(this)).catch(function() {
        this.getViewModel().setProperty("/suggestedExperts", []);
      }.bind(this));
    },

    // Same bindList+Filter+$expand pattern already proven in Profile's
    // _loadPublications - not a new mechanism.
    _loadOwnSkillsAndCerts: function() {
      this.oPeopleModel.bindContext("/getMyUserID()").requestObject().then(function(oData) {
        var sUserID = oData && oData.value;
        if (!sUserID) return null;
        this._sUserID = sUserID;

        var oListBinding = this.oPeopleModel.bindList("/People", null, null,
          [new Filter("userID", FilterOperator.EQ, sUserID)],
          { $expand: "skills,certifications($expand=certification)" }
        );
        return oListBinding.requestContexts(0, 1);
      }.bind(this)).then(function(aContexts) {
        if (!aContexts || !aContexts.length) return;
        var oProfile = aContexts[0].getObject();
        var aCerts = oProfile.certifications || [];

        this.getViewModel().setProperty("/employee/skills", oProfile.skills || []);
        this.getViewModel().setProperty("/employee/certsEarned", aCerts.filter(function(c) { return c.status === "earned"; }));
        this.getViewModel().setProperty("/employee/certsInProgress", aCerts.filter(function(c) { return c.status === "in_progress"; }));
        this.getViewModel().setProperty("/employee/certsRecommended", aCerts.filter(function(c) { return c.status === "recommended"; }));
      }.bind(this)).catch(function() { /* widgets stay empty - not fatal */ });
    },

    // ────────────────────────────────────────────────────────────
    // Timeline dialog - same structure as Profile's, own file (fragments
    // aren't shared cross-app - see Experts Phase 2).
    // ────────────────────────────────────────────────────────────

    onOpenTimeline: function() {
      if (!this._pTimelineDialog) {
        this._pTimelineDialog = Fragment.load({
          id: this.getView().getId(),
          name: "aymax.hub.view.dashboard.fragments.ContributionTimelineDialog",
          controller: this
        }).then(function(oDialog) {
          this.getView().addDependent(oDialog);
          return oDialog;
        }.bind(this));
      }
      this._loadTimeline();
      this._pTimelineDialog.then(function(oDialog) { oDialog.open(); });
    },

    onCloseTimelineDialog: function() {
      this._pTimelineDialog.then(function(oDialog) { oDialog.close(); });
    },

    _loadTimeline: function() {
      if (!this._sUserID) return;
      var oContext = this.oPeopleModel.bindContext(
        "/getContributionTimeline(userID='" + this._sUserID + "',months=6)"
      );
      oContext.requestObject().then(function(oData) {
        var aEntries = (oData && oData.value) || [];
        var mByMonth = {};
        var aOrder = [];
        aEntries.forEach(function(e) {
          if (!mByMonth[e.monthLabel]) { mByMonth[e.monthLabel] = []; aOrder.push(e.monthLabel); }
          mByMonth[e.monthLabel].push(e);
        });
        this.getViewModel().setProperty("/timelineGroups",
          aOrder.map(function(sLabel) { return { monthLabel: sLabel, entries: mByMonth[sLabel] }; }));
      }.bind(this)).catch(function() {
        this.getViewModel().setProperty("/timelineGroups", []);
      }.bind(this));
    },

    // ────────────────────────────────────────────────────────────
    // Navigation - Notifications/Knowledge/Experts/Profile are all now
    // migrated into this same shared app, so these are genuinely internal
    // navigation and use navTo() instead of the full-page redirects every
    // Lot 2 module used before the migration. Feed is deliberately still
    // external (Option A keeps it a separate app), so it keeps its
    // window.location.href.
    // ────────────────────────────────────────────────────────────

    onNavToNotifications: function() {
      this.getRouter().navTo("notifications");
    },

    onNavToKnowledge: function() {
      this.getRouter().navTo("knowledgeList");
    },

    onNavToKnowledgeItem: function(oEvent) {
      var sItemID = oEvent.getSource().getBindingContext("knowledge").getProperty("ID");
      this.getRouter().navTo("knowledgeDetail", { itemID: sItemID });
    },

    onNavToExpertProfile: function(oEvent) {
      var sUserID = oEvent.getSource().getBindingContext("view-dashboard").getProperty("userID");
      if (sUserID) this.getRouter().navTo("profile", { userID: sUserID });
    },

    onNavToUsers: function() {
      this.getRouter().navTo("expertsList");
    },

    onNavToFeed: function() {
      // Feed is unchanged and unmoved - still a separate app, still
      // reached the same way.
      window.location.href = "/feed/webapp/index.html";
    },

    // Rooms has no standalone management page in this app yet - a real,
    // honest message rather than a dead link.
    onNavToRoom: function() {
      MessageToast.show(this.getText("comingSoon"));
    },

    onNavToRewards: function() {
      MessageToast.show(this.getText("comingSoon"));
    },

    // No Validation page exists yet (Lot 3, TODO-INTEGRATION.md I-02) -
    // named for what it will become, not reusing a generic handler, so
    // wiring the real page later is a one-line change here.
    onNavToValidation: function() {
      MessageToast.show(this.getText("comingSoon"));
    },

    // Pending Reviews is always empty today (TODO-INTEGRATION.md I-02),
    // so these never actually fire yet - kept for when ValidationProvider
    // returns real rows, so the UI needs no change at that point.
    onApproveReview: function() {
      MessageToast.show(this.getText("comingSoon"));
    },

    onRejectReview: function() {
      MessageToast.show(this.getText("comingSoon"));
    }
  });
});
