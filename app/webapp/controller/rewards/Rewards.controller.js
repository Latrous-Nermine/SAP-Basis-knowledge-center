sap.ui.define([
  "../BaseController",
  "../../model/rewards/formatter",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(BaseController, formatter, MessageToast, MessageBox) {
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
      window.location.href = "/feed/webapp/index.html";
    },

    // Only the "Articles disponibles" stat is computed for real - the
    // other two (points distributed / redeemed this month) have no
    // backing entity to compute from, same as in the original design,
    // and stay as the same static illustrative text it always had.
    onRewardsListUpdated: function(oEvent) {
      this.getViewModel().setProperty("/availableCount", oEvent.getParameter("total"));
    },

    // Riadh's original had no add/edit form built at all (toast-only
    // simulation) - preserved as-is rather than building a new dialog
    // that wasn't part of what's being migrated.
    onAddReward: function() {
      MessageToast.show(this.getText("addEditNotBuilt"));
    },

    onEditReward: function() {
      MessageToast.show(this.getText("addEditNotBuilt"));
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
