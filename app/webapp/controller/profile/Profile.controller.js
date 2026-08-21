sap.ui.define([
  "../BaseController",
  "../../model/profile/formatter",
  "sap/m/MessageBox",
  "sap/ui/core/Fragment",
  "sap/ui/model/Filter"
], function(BaseController, formatter, MessageBox, Fragment, Filter) {
  "use strict";

  return BaseController.extend("aymax.hub.controller.profile.Profile", {

    formatter: formatter,

    // Overrides BaseController's getResourceBundle() (which returns the
    // shell's own tiny 2-key i18n bundle) so this.getText()/formatter
    // lookups resolve against this module's real, full bundle instead.
    getResourceBundle: function() {
      return this.getOwnerComponent().getModel("i18n-profile").getResourceBundle();
    },

    // Overrides BaseController's getViewModel() (which returns the shell's
    // generic "view" model) so every existing this.getViewModel() call
    // below - there are many - keeps working unchanged, now pointed at
    // this module's own named model instead of a shared one every module
    // would otherwise collide on.
    getViewModel: function() {
      return this.getOwnerComponent().getModel("view-profile");
    },

    onInit: function() {
      formatter.setResourceBundle(this.getResourceBundle());
      // Was the unnamed default model in the old standalone app; now named
      // models, since one shared Component can only have one true default.
      this.oPeopleModel = this.getOwnerComponent().getModel("people");
      this.oFeedModel = this.getOwnerComponent().getModel("feed");

      // Design constant (docs/design/Profile.md) - the target the Badges
      // KPI card's progress bar fills towards, not per-user data. Used to
      // be set once in this module's own Component.js; the shared
      // manifest's "view-profile" model is empty by default (it can't know
      // any module's own constants), so this needs setting explicitly here.
      this.getViewModel().setProperty("/badgeGoal", 1000);

      this.getRouter().getRoute("profile").attachPatternMatched(this._onRouteMatched, this);
    },

    onHomePress: function() {
      // Feed is unchanged and unmoved - still a separate app, still
      // reached the same way.
      window.location.href = "/feed/webapp/index.html";
    },

    _onRouteMatched: function(oEvent) {
      var sUserID = oEvent.getParameter("arguments").userID;

      // Bare "#/profile" (no {userID} segment) - resolve to the caller's own
      // profile via the same PeopleService function _loadCurrentUserID already
      // calls, then continue exactly as if that ID had been in the URL.
      if (!sUserID) {
        this.oPeopleModel.bindContext("/getMyUserID()").requestObject().then(function(oData) {
          this._loadProfile(oData && oData.value);
        }.bind(this)).catch(function() {
          MessageBox.error(this.getText("errorUserNotFound"));
        }.bind(this));
        return;
      }

      this._loadProfile(sUserID);
    },

    _loadProfile: function(sUserID) {
      this._sUserID = sUserID;

      this.getViewModel().setProperty("/busy", true);
      this.getViewModel().setProperty("/userID", sUserID);

      this.getView().bindElement({
        path: "/People('" + sUserID + "')",
        model: "people",
        parameters: {
          $expand: "skills,userBadges($expand=badge),certifications($expand=certification),technologies"
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
    //
    // isFollowedByMe is also copied into the view model here rather than
    // bound to the entity directly: a formatter on that virtual field proved
    // unreliable at reflecting updates (verified via headless testing - the
    // bound value was correctly false, the formatter returns the correct
    // text when called directly with false, yet the rendered button text
    // stayed on the "true" branch). Owning this value in the view model
    // sidesteps whatever that binding-refresh gap is.
    _onProfileDataReceived: function() {
      var oData = this.getView().getBindingContext("people").getObject();
      var aCerts = oData.certifications || [];

      this.getViewModel().setProperty("/certsEarned", aCerts.filter(function(c) { return c.status === "earned"; }));
      this.getViewModel().setProperty("/certsInProgress", aCerts.filter(function(c) { return c.status === "in_progress"; }));
      this.getViewModel().setProperty("/certsRecommended", aCerts.filter(function(c) { return c.status === "recommended"; }));
      this.getViewModel().setProperty("/isFollowedByMe", !!oData.isFollowedByMe);
    },

    // Own PeopleService, not Lot 1's FeedService - avoids a cross-service
    // call for something req.user already answers directly, and sidesteps
    // a real, never-fully-explained bug where getCurrentUserProfile()
    // returned 204/null specifically when batched alongside the Publications
    // list request on the feed model.
    _loadCurrentUserID: function() {
      var oContext = this.oPeopleModel.bindContext("/getMyUserID()");
      oContext.requestObject().then(function(oData) {
        var sMyUserID = oData && oData.value;
        this.getViewModel().setProperty("/currentUserID", sMyUserID || "");
        this.getViewModel().setProperty("/isOwnProfile", sMyUserID === this._sUserID);
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
      oContext.requestObject().then(function(oData) {
        // A collection-returning unbound function's requestObject() gives back
        // the raw OData wrapper ({"@odata.context":..., value:[...]}), unlike
        // a plain complex-type function (getScoreBreakdown) which resolves
        // directly - unwrap .value or the list binding silently iterates the
        // wrapper's own two keys instead of the actual rows.
        this.getViewModel().setProperty("/activity", (oData && oData.value) || []);
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
      var oContext = this.getView().getBindingContext("people");
      var bIsFollowedByMe = this.getViewModel().getProperty("/isFollowedByMe");
      var sAction = bIsFollowedByMe ? "unfollowUser" : "followUser";
      var sErrorKey = bIsFollowedByMe ? "errorUnfollow" : "errorFollow";

      var oActionContext = this.bindAction(this.oPeopleModel, "/" + sAction, { userID: this._sUserID });
      oActionContext.execute().then(function() {
        // The action just succeeded, so the new state is known with
        // certainty - set it directly instead of re-deriving it from the
        // entity binding's virtual field (see _onProfileDataReceived).
        this.getViewModel().setProperty("/isFollowedByMe", !bIsFollowedByMe);
        oContext.refresh(); // keeps followersCount/followingCount in sync
      }.bind(this)).catch(function(oError) {
        MessageBox.error(oError.message || this.getText(sErrorKey));
      }.bind(this));
    },

    onOpenTimeline: function() {
      if (!this._oTimelineDialog) {
        Fragment.load({
          id: this.getView().getId(),
          name: "aymax.hub.view.profile.ContributionTimelineDialog",
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
      oContext.requestObject().then(function(oData) {
        // Same collection-wrapper unwrapping as _loadActivity above.
        this.getViewModel().setProperty("/timelineGroups", this._groupByMonth((oData && oData.value) || []));
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
