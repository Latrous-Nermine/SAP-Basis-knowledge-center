sap.ui.define([
  "sap/ui/core/format/DateFormat"
], function(DateFormat) {
  "use strict";

  var STATUS_META = {
    pending:  { key: "statusPending",  state: "Warning" },
    approved: { key: "statusApproved", state: "Success" },
    rejected: { key: "statusRejected", state: "Error" }
  };

  var oResourceBundle = null;

  return {

    setResourceBundle: function(oBundle) {
      oResourceBundle = oBundle;
    },

    formatStatusText: function(sStatus) {
      if (!oResourceBundle) return sStatus;
      var oMeta = STATUS_META[sStatus];
      return oMeta ? oResourceBundle.getText(oMeta.key) : sStatus;
    },

    formatStatusState: function(sStatus) {
      var oMeta = STATUS_META[sStatus];
      return oMeta ? oMeta.state : "None";
    },

    formatTabPending: function(iCount) {
      return oResourceBundle ? oResourceBundle.getText("tabPending", [iCount || 0]) : "";
    },

    formatTabApproved: function(iCount) {
      return oResourceBundle ? oResourceBundle.getText("tabApproved", [iCount || 0]) : "";
    },

    formatTabRejected: function(iCount) {
      return oResourceBundle ? oResourceBundle.getText("tabRejected", [iCount || 0]) : "";
    },

    formatTabAll: function(iCount) {
      return oResourceBundle ? oResourceBundle.getText("tabAll", [iCount || 0]) : "";
    },

    // Original bound createdAt raw (a plain ISO string) - CLAUDE.md's
    // own convention (relative dates via DateFormat, never hand-written)
    // applies here same as everywhere else in this app.
    formatCreatedAt: function(vDate) {
      if (!vDate) return "";
      return DateFormat.getDateTimeInstance({ relative: true }).format(new Date(vDate));
    }
  };
});
