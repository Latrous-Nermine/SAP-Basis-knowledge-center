sap.ui.define([], function() {
  "use strict";

  var STATUS_META = {
    draft:     { key: "statusDraft",     state: "None" },
    submitted: { key: "statusSubmitted", state: "Warning" },
    validated: { key: "statusValidated", state: "Success" }
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
    }
  };
});
