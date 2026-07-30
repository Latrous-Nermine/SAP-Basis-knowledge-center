sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function(UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("aymax.notifications.Component", {
    metadata: {
      manifest: "json"
    },

    init: function() {
      UIComponent.prototype.init.apply(this, arguments);

      var oViewModel = new JSONModel({
        unreadCount: 0,
        busy: false
      });
      this.setModel(oViewModel, "view");

      this._loadUnreadCount();
    },

    _loadUnreadCount: function() {
      var oModel = this.getModel();
      var oViewModel = this.getModel("view");

      var oContext = oModel.bindContext("/unreadCount()");
      oContext.requestObject().then(function(iCount) {
        oViewModel.setProperty("/unreadCount", iCount || 0);
      }).catch(function(oError) {
        console.error("Failed to load unread count", oError);
      });
    }
  });
});
