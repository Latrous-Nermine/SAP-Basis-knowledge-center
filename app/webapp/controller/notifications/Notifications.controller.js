sap.ui.define([
  "../BaseController",
  "../../model/notifications/formatter",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(BaseController, formatter, MessageToast, MessageBox) {
  "use strict";

  return BaseController.extend("aymax.hub.controller.notifications.Notifications", {

    formatter: formatter,

    // Overrides BaseController's getResourceBundle() (which returns the
    // shell's own tiny 2-key i18n bundle) so this.getText()/formatter
    // lookups resolve against this module's real, full bundle instead -
    // missing this was why every programmatic i18n lookup (KPI labels,
    // category tabs, formatter text) was silently reading the wrong file.
    getResourceBundle: function() {
      return this.getOwnerComponent().getModel("i18n-notifications").getResourceBundle();
    },

    // Overrides BaseController's getViewModel() (which returns the shell's
    // generic "view" model) so any future this.getViewModel() call in this
    // module resolves to its own named model, not one shared across every
    // migrated module.
    getViewModel: function() {
      return this.getOwnerComponent().getModel("view-notifications");
    },

    onInit: function() {
      // Was the unnamed default model in the old standalone app
      // (aymax.notifications.Component) - now the named "notification"
      // model, since one shared Component can only have one true default.
      this.oModel = this.getOwnerComponent().getModel("notification");
      formatter.setResourceBundle(this.getResourceBundle());
      this._refreshUnreadCount();
    },

    onHomePress: function() {
      // Feed is unchanged and unmoved - still a separate app, still reached
      // the same way.
      window.location.href = "/feed/webapp/index.html";
    },

    onNotificationPress: function(oEvent) {
      var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
      // Must name the model here now - the row's context lives in the
      // "notification" named model, not the (nonexistent) default one.
      var oContext = oItem.getBindingContext("notification");
      if (!oContext || oContext.getProperty("isRead")) return;

      var sID = oContext.getProperty("ID");
      var oActionContext = this.bindAction(this.oModel, "/markRead", {
        notificationID: sID
      });

      oActionContext.execute().then(function() {
        this._refreshList();
        this._refreshUnreadCount();
      }.bind(this)).catch(function() {
        MessageToast.show(this.getText("errorMarkRead"));
      }.bind(this));
    },

    onMarkAllRead: function() {
      var oActionContext = this.bindAction(this.oModel, "/markAllRead");

      oActionContext.execute().then(function() {
        MessageToast.show(this.getText("allMarkedRead"));
        this._refreshList();
        this._refreshUnreadCount();
      }.bind(this)).catch(function() {
        MessageBox.error(this.getText("errorMarkAllRead"));
      }.bind(this));
    },

    _refreshList: function() {
      var oList = this.byId("notificationList");
      if (oList) {
        oList.getBinding("items").refresh();
      }
    },

    _refreshUnreadCount: function() {
      var oViewModel = this.getViewModel();
      var oContext = this.oModel.bindContext("/unreadCount()");
      oContext.requestObject().then(function(oData) {
        // A scalar-returning unbound function's requestObject() gives back
        // the raw OData wrapper ({"@odata.context":..., value: N}), not the
        // bare number - unwrap .value or the bell shows "[object Object]".
        oViewModel.setProperty("/unreadCount", (oData && oData.value) || 0);
      });
    }
  });
});
