sap.ui.define([
  "./BaseController",
  "../model/formatter",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(BaseController, formatter, MessageToast, MessageBox) {
  "use strict";

  return BaseController.extend("aymax.notifications.controller.Notifications", {

    formatter: formatter,

    onInit: function() {
      this.oModel = this.getOwnerComponent().getModel();
      formatter.setResourceBundle(this.getResourceBundle());
    },

    onHomePress: function() {
      // Same standalone-app navigation as Feed's bell -> here: no shared
      // shell/router yet (docs/lot2-analysis.md §6.3 still open).
      window.location.href = "/feed/webapp/index.html";
    },

    onNotificationPress: function(oEvent) {
      var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
      var oContext = oItem.getBindingContext();
      if (!oContext || oContext.getProperty("isRead")) return;

      var sID = oContext.getProperty("ID");
      var oActionContext = this.oModel.bindContext("/markRead")({
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
      var oActionContext = this.oModel.bindContext("/markAllRead")();

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
      oContext.requestObject().then(function(iCount) {
        oViewModel.setProperty("/unreadCount", iCount || 0);
      });
    }
  });
});
