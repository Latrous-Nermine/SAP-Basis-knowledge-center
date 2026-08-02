sap.ui.define([
  "./BaseController",
  "../model/formatter",
  "sap/m/MessageBox",
  "sap/ui/core/Fragment",
  "sap/ui/model/Filter"
], function(BaseController, formatter, MessageBox, Fragment, Filter) {
  "use strict";

  return BaseController.extend("aymax.profile.controller.Profile", {

    formatter: formatter,

    onInit: function() {
      formatter.setResourceBundle(this.getResourceBundle());
      this.oPeopleModel = this.getOwnerComponent().getModel();
      this.oFeedModel = this.getOwnerComponent().getModel("feed");
      this.getRouter().getRoute("profile").attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function(oEvent) {
      var sUserID = oEvent.getParameter("arguments").userID;
      this._sUserID = sUserID;

      this.getViewModel().setProperty("/busy", true);
      this.getViewModel().setProperty("/userID", sUserID);

      this.getView().bindElement({
        path: "/People('" + sUserID + "')",
        parameters: {
          $expand: "skills,userBadges($expand=badge),certifications($expand=certification)"
        },
        events: {
          dataRequested: function() {
            this.getViewModel().setProperty("/busy", true);
          }.bind(this),
          dataReceived: function(oEvent) {
            this.getViewModel().setProperty("/busy", false);
            if (!oEvent.getParameter("data")) {
              MessageBox.error(this.getText("errorUserNotFound"));
              return;
            }
            this._onProfileDataReceived();
          }.bind(this)
        }
      });

      this._loadCurrentUserID();
      this._loadScoreBreakdown(sUserID);
      this._loadActivity(sUserID);
      this._loadPublications(sUserID);
    },

    // The People OData response already carries skills/userBadges/certifications
    // via $expand - splitting certifications by status happens here once, not
    // via a fragile inline $filter binding string.
    _onProfileDataReceived: function() {
      var oData = this.getView().getBindingContext().getObject();
      var aCerts = oData.certifications || [];

      this.getViewModel().setProperty("/certsEarned", aCerts.filter(function(c) { return c.status === "earned"; }));
      this.getViewModel().setProperty("/certsInProgress", aCerts.filter(function(c) { return c.status === "in_progress"; }));
      this.getViewModel().setProperty("/certsRecommended", aCerts.filter(function(c) { return c.status === "recommended"; }));
    },

    _loadCurrentUserID: function() {
      var oContext = this.oFeedModel.bindContext("/getCurrentUserProfile()");
      oContext.requestObject().then(function(oData) {
        var bIsOwnProfile = !!(oData && oData.userID === this._sUserID);
        this.getViewModel().setProperty("/currentUserID", oData ? oData.userID : "");
        this.getViewModel().setProperty("/isOwnProfile", bIsOwnProfile);
      }.bind(this)).catch(function() {
        this.getViewModel().setProperty("/isOwnProfile", false);
      }.bind(this));
    },

    _loadScoreBreakdown: function(sUserID) {
      var oContext = this.oPeopleModel.bindContext("/getScoreBreakdown(userID='" + sUserID + "')");
      oContext.requestObject().then(function(oData) {
        this.getViewModel().setProperty("/scoreBreakdown", oData || { badges: 0, publications: 0, contributions: 0 });
      }.bind(this)).catch(function() {
        this.getViewModel().setProperty("/scoreBreakdown", { badges: 0, publications: 0, contributions: 0 });
      }.bind(this));
    },

    _loadActivity: function(sUserID) {
      var oContext = this.oPeopleModel.bindContext("/getActivity(userID='" + sUserID + "',limit=10)");
      oContext.requestObject().then(function(aData) {
        this.getViewModel().setProperty("/activity", aData || []);
      }.bind(this)).catch(function() {
        this.getViewModel().setProperty("/activity", []);
      }.bind(this));
    },

    // Publications reuse Lot 1's Feed service directly (Posts filtered by
    // author) rather than duplicating post data anywhere in this module.
    _loadPublications: function(sUserID) {
      var oListBinding = this.oFeedModel.bindList("/Posts", null,
        null,
        [new Filter("author_userID", "EQ", sUserID)],
        { $expand: "tags", $orderby: "createdAt desc" }
      );
      oListBinding.requestContexts(0, 20).then(function(aContexts) {
        this.getViewModel().setProperty("/publications", aContexts.map(function(c) { return c.getObject(); }));
      }.bind(this)).catch(function() {
        this.getViewModel().setProperty("/publications", []);
      }.bind(this));
    },

    onToggleFollow: function() {
      var oContext = this.getView().getBindingContext();
      var bIsFollowedByMe = oContext.getProperty("isFollowedByMe");
      var sAction = bIsFollowedByMe ? "unfollowUser" : "followUser";
      var sErrorKey = bIsFollowedByMe ? "errorUnfollow" : "errorFollow";

      var oActionContext = this.oPeopleModel.bindContext("/" + sAction)({ userID: this._sUserID });
      oActionContext.execute().then(function() {
        oContext.refresh();
      }.bind(this)).catch(function(oError) {
        MessageBox.error(oError.message || this.getText(sErrorKey));
      }.bind(this));
    },

    onOpenTimeline: function() {
      if (!this._oTimelineDialog) {
        Fragment.load({
          id: this.getView().getId(),
          name: "aymax.profile.view.ContributionTimelineDialog",
          controller: this
        }).then(function(oDialog) {
          this._oTimelineDialog = oDialog;
          this.getView().addDependent(oDialog);
          this._loadTimelineAndOpen();
        }.bind(this));
      } else {
        this._loadTimelineAndOpen();
      }
    },

    _loadTimelineAndOpen: function() {
      var oContext = this.oPeopleModel.bindContext("/getContributionTimeline(userID='" + this._sUserID + "',months=6)");
      oContext.requestObject().then(function(aData) {
        this.getViewModel().setProperty("/timelineGroups", this._groupByMonth(aData || []));
        this._oTimelineDialog.open();
      }.bind(this)).catch(function() {
        this.getViewModel().setProperty("/timelineGroups", []);
        this._oTimelineDialog.open();
      }.bind(this));
    },

    // Flat, already-sorted rows -> [{monthLabel, entries:[...]}], grouping by
    // consecutive equal monthLabel (a plain JS reduce, not a UI5 sorter group -
    // simpler to get right than groupHeaderFactory for a one-off dialog list).
    _groupByMonth: function(aRows) {
      var aGroups = [];
      aRows.forEach(function(oRow) {
        var oLastGroup = aGroups[aGroups.length - 1];
        if (oLastGroup && oLastGroup.monthLabel === oRow.monthLabel) {
          oLastGroup.entries.push(oRow);
        } else {
          aGroups.push({ monthLabel: oRow.monthLabel, entries: [oRow] });
        }
      });
      return aGroups;
    },

    onCloseTimelineDialog: function() {
      this._oTimelineDialog.close();
    }
  });
});
