sap.ui.define([
  "sap/ui/core/format/DateFormat"
], function(DateFormat) {
  "use strict";

  // Plain module-scope functions, not object methods - a formatter
  // invoked via a composite/parts binding is NOT guaranteed to run with
  // `this` bound to this module (same footgun documented in
  // model/knowledge/formatter.js).
  function formatUploadedAt(vDate) {
    if (!vDate) return "";
    var oFormatter = DateFormat.getDateTimeInstance({ relative: true });
    return oFormatter.format(new Date(vDate));
  }

  return {
    formatIcon: function(sType) {
      var mMap = {
        "pdf": "sap-icon://pdf-attachment",
        "zip": "sap-icon://attachment-zip-file",
        "doc": "sap-icon://doc-attachment",
        "docx": "sap-icon://doc-attachment",
        "png": "sap-icon://attachment-photo",
        "jpg": "sap-icon://attachment-photo"
      };
      return mMap[sType] || "sap-icon://attachment";
    },

    formatFileSize: function(iBytes) {
      if (!iBytes && iBytes !== 0) return "";
      var aUnits = ["o", "Ko", "Mo", "Go"];
      var i = Math.floor(Math.log(iBytes) / Math.log(1024));
      return Math.round((iBytes / Math.pow(1024, i)) * 10) / 10 + " " + aUnits[i];
    },

    formatUploadedAt: formatUploadedAt,

    // "{size} · Ajouté {relative date}" - matches the original's exact
    // combined meta line.
    formatFileMeta: function(sSize, vUploadedAt) {
      var sDate = formatUploadedAt(vUploadedAt);
      return sSize ? (sSize + " · Ajouté " + sDate) : sDate;
    }
  };
});
