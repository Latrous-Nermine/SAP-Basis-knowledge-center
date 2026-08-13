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
