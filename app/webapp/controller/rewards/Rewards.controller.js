sap.ui.define([
  "../BaseController",
  "../../model/rewards/formatter",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/core/Fragment"
], function(BaseController, formatter, MessageToast, MessageBox, Fragment) {
  "use strict";

  return BaseController.extend("aymax.hub.controller.rewards.Rewards", {

    formatter: formatter,

    getResourceBundle: function() {
      return this.getOwnerComponent().getModel("i18n-rewards").getResourceBundle();
    },

    getViewModel: function() {
      return this.getOwnerComponent().getModel("view-rewards");
    },

    onInit: function() {
      this.oModel = this.getOwnerComponent().getModel("rewards");

      // Add/Edit/Delete are HR/Administrator-only server-side (the
      // catalog's own @restrict, rewards-service.cds) - this was showing
      // to every role regardless, so an Employee saw fully-clickable
      // management controls that could only ever 403 (Delete is wired to
      // a real backend call, not a stub). Same server-resolved-role
      // pattern as KnowledgeDetail/App.controller.js's own nav guard -
      // a UI hint only, the real gate stays the backend's own restrict.
      this.getOwnerComponent().getModel("people").bindContext("/getMyRole()").requestObject()
        .then(function(oData) {
          var sRole = oData && oData.value;
          this.getViewModel().setProperty("/canManage", sRole === "HR" || sRole === "Administrator");
        }.bind(this))
        .catch(function() {
          this.getViewModel().setProperty("/canManage", false);
        }.bind(this));

      // Read-only "you qualify" / "X points away" per reward, compared
      // against the viewer's own reputation - the catalog previously had
      // no relationship at all to the reputation it's presumably
      // rewarding.
      var oPeopleModel = this.getOwnerComponent().getModel("people");
      oPeopleModel.bindContext("/getMyUserID()").requestObject().then(function(oData) {
        var sMyUserID = oData && oData.value;
        if (!sMyUserID) return;
        return oPeopleModel.bindContext("/People('" + sMyUserID + "')").requestObject();
      }).then(function(oProfile) {
        if (oProfile) this.getViewModel().setProperty("/myReputation", oProfile.reputation || 0);
      }.bind(this)).catch(function() {
        // No score to compare against - qualificationLabel already
        // treats an unset /myReputation as "don't show anything".
      });
    },

    onHomePress: function() {
      // Feed is rendered inside this shell at its own "feed" route
      // (view/feed/Feed.view.xml) - navigate via the router, not a
      // hard page load to the standalone /feed/webapp app.
      this.getRouter().navTo("feed");
    },

    // Only the "Articles disponibles" stat is computed for real - the
    // other two (points distributed / redeemed this month) have no
    // backing entity to compute from, same as in the original design,
    // and stay as the same static illustrative text it always had.
    onRewardsListUpdated: function(oEvent) {
      this.getViewModel().setProperty("/availableCount", oEvent.getParameter("total"));
    },

    // Add/Edit (2026-08) - Riadh's original had no form built at all
    // (toast-only simulation); built for real now, on explicit request.
    // The backend's own @restrict already granted HR/Administrator
    // CREATE/UPDATE on Rewards from the start (rewards-service.cds) - the
    // authorization was never the missing piece, only this dialog was.
    onAddReward: function() {
      this._openRewardDialog(null);
    },

    onEditReward: function(oEvent) {
      this._openRewardDialog(oEvent.getSource().getBindingContext("rewards"));
    },

    // oExistingContext is null for Add, or the pressed card's own
    // "rewards" binding context for Edit - captured now (not re-looked-up
    // in onSaveReward) since it directly identifies which row to PATCH.
    _openRewardDialog: function(oExistingContext) {
      if (!this._pRewardDialog) {
        this._pRewardDialog = Fragment.load({
          id: this.getView().getId(),
          name: "aymax.hub.view.rewards.RewardDialog",
          controller: this
        }).then(function(oDialog) {
          this.getView().addDependent(oDialog);
          return oDialog;
        }.bind(this));
      }

      this._oEditingRewardContext = oExistingContext;
      this.getViewModel().setProperty("/rewardFormIsEdit", !!oExistingContext);
      this.getViewModel().setProperty("/rewardForm", oExistingContext ? {
        name: oExistingContext.getProperty("name"),
        points: oExistingContext.getProperty("points"),
        category: oExistingContext.getProperty("category"),
        icon: oExistingContext.getProperty("icon") || "sap-icon://gift"
      } : {
        name: "", points: null, category: "", icon: "sap-icon://gift"
      });

      // Category suggestions - the distinct values already in the loaded
      // catalogue (real data, not an invented enum: the column is a plain
      // free-text String(60) in the schema - see db/lot3.cds). Read from
      // the visible list's own already-loaded rows rather than a fresh
      // request, since they're already sitting right there.
      var aRows = this.byId("rewardsList").getBinding("items").getCurrentContexts()
        .map(function(c) { return c.getProperty("category"); })
        .filter(Boolean);
      var aDistinctCategories = aRows.filter(function(s, i) { return aRows.indexOf(s) === i; });
      this.getViewModel().setProperty("/rewardCategorySuggestions",
        aDistinctCategories.map(function(s) { return { name: s }; }));

      this._pRewardDialog.then(function(oDialog) { oDialog.open(); });
    },

    _selectRewardIcon: function(sIcon) {
      this.getViewModel().setProperty("/rewardForm/icon", sIcon);
    },
    onSelectRewardIconGift: function() { this._selectRewardIcon("sap-icon://gift"); },
    onSelectRewardIconLaptop: function() { this._selectRewardIcon("sap-icon://laptop"); },
    onSelectRewardIconPhone: function() { this._selectRewardIcon("sap-icon://iphone"); },
    onSelectRewardIconBag: function() { this._selectRewardIcon("sap-icon://travel-request"); },
    onSelectRewardIconFavorite: function() { this._selectRewardIcon("sap-icon://favorite"); },
    onSelectRewardIconCourse: function() { this._selectRewardIcon("sap-icon://course-book"); },

    onCancelReward: function() {
      this._pRewardDialog.then(function(oDialog) { oDialog.close(); });
    },

    onSaveReward: function() {
      var oForm = this.getViewModel().getProperty("/rewardForm");

      if (!oForm.name || !oForm.name.trim()) {
        MessageToast.show(this.getText("errorRewardName"));
        return;
      }
      var iPoints = parseInt(oForm.points, 10);
      if (!iPoints || iPoints <= 0) {
        MessageToast.show(this.getText("errorRewardPoints"));
        return;
      }

      var oPayload = {
        name: oForm.name.trim(),
        points: iPoints,
        category: (oForm.category || "").trim(),
        icon: oForm.icon || "sap-icon://gift"
      };

      if (this._oEditingRewardContext) {
        var oContext = this._oEditingRewardContext;
        Object.keys(oPayload).forEach(function(sKey) { oContext.setProperty(sKey, oPayload[sKey]); });
        this.oModel.submitBatch("$auto").then(function() {
          MessageToast.show(this.getText("rewardUpdated"));
          this._pRewardDialog.then(function(oDialog) { oDialog.close(); });
        }.bind(this)).catch(function(oError) {
          MessageBox.error((oError && oError.message) || this.getText("errorUpdateReward"));
        }.bind(this));
      } else {
        // Created directly against the visible list's own binding (not a
        // separate bindList("/Rewards")) so the new card appears
        // immediately - same fix already needed once this session for
        // Knowledge Center's own "my new item doesn't show up" bug
        // (filter()/create() on a DIFFERENT binding instance than the one
        // actually rendering the list never reaches it).
        var oListBinding = this.byId("rewardsList").getBinding("items");
        oListBinding.create(oPayload).created().then(function() {
          MessageToast.show(this.getText("rewardCreated"));
          this._pRewardDialog.then(function(oDialog) { oDialog.close(); });
        }.bind(this)).catch(function(oError) {
          MessageBox.error((oError && oError.message) || this.getText("errorCreateReward"));
        }.bind(this));
      }
    },

    // Delete IS wired for real (unlike add/edit) - it's a single,
    // unambiguous operation the backend already correctly restricts to
    // HR/Admin (rewards-service.cds), so there's no reason to leave it
    // as a fake simulation like the original.
    onDeleteReward: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("rewards");
      var sName = oContext.getProperty("name");

      MessageBox.confirm(this.getText("deleteRewardConfirmText", [sName]), {
        title: this.getText("deleteRewardConfirmTitle"),
        onClose: function(sAction) {
          if (sAction !== MessageBox.Action.OK) return;

          oContext.delete().then(function() {
            MessageToast.show(this.getText("rewardDeleted"));
          }.bind(this)).catch(function(oError) {
            MessageBox.error((oError && oError.message) || this.getText("errorDeleteReward"));
          }.bind(this));
        }.bind(this)
      });
    }
  });
});
