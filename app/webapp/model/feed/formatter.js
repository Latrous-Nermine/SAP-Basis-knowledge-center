sap.ui.define([
  "sap/ui/core/format/DateFormat",
  "../shared/avatarSrc"
], function(DateFormat, avatarSrcUtil) {
  "use strict";

  return {
    // sMimeType/sUserID (2026-08, real upload added) take priority when
    // present - falls through to the original avatarUrl-then-ui-avatars.com
    // chain otherwise, unchanged, for anyone who hasn't uploaded a real
    // photo yet.
    formatAvatar: function(sMimeType, sUserID, sUrl, sName) {
      var sRealSrc = avatarSrcUtil.avatarSrc(sUserID, sMimeType);
      if (sRealSrc) return sRealSrc;
      if (sUrl && sUrl !== "null" && sUrl !== "") return sUrl;
      var initials = sName ? sName.replace(/[^A-Z]/g, "").substring(0, 2) : "AY";
      return "https://ui-avatars.com/api/?name=" + encodeURIComponent(sName || "AYMAX") + "&background=1E3A8A&color=fff&size=128";
    },

    formatDate: function(sDate) {
      if (!sDate) return "";
      var oFormatter = DateFormat.getDateTimeInstance({ style: "medium" });
      return oFormatter.format(new Date(sDate));
    },

    formatRelativeTime: function(sDate) {
      if (!sDate) return "";
      var oDate = new Date(sDate);
      var oNow = new Date();
      var iDiffMs = oNow - oDate;
      var iDiffMin = Math.floor(iDiffMs / (1000 * 60));
      var iDiffHours = Math.floor(iDiffMin / 60);
      var iDiffDays = Math.floor(iDiffHours / 24);

      if (iDiffMin < 1) return "À l'instant";
      if (iDiffMin < 60) return "Il y a " + iDiffMin + " min";
      if (iDiffHours < 24) return "Il y a " + iDiffHours + " h";
      if (iDiffDays === 1) return "Hier";
      if (iDiffDays < 30) return "Il y a " + iDiffDays + " jours";
      return DateFormat.getDateInstance({ style: "medium" }).format(oDate);
    },

    formatFileSize: function(iBytes) {
      if (!iBytes) return "0 B";
      var aSizes = ['B', 'KB', 'MB', 'GB'];
      var i = Math.floor(Math.log(iBytes) / Math.log(1024));
      return Math.round(iBytes / Math.pow(1024, i) * 100) / 100 + ' ' + aSizes[i];
    },

    formatFileIcon: function(sType) {
      var mIcons = {
        pdf: "sap-icon://pdf-attachment",
        doc: "sap-icon://doc-attachment",
        docx: "sap-icon://doc-attachment",
        zip: "sap-icon://attachment-zip-file",
        xls: "sap-icon://excel-attachment",
        xlsx: "sap-icon://excel-attachment",
        png: "sap-icon://attachment-photo",
        jpg: "sap-icon://attachment-photo",
        jpeg: "sap-icon://attachment-photo",
        webp: "sap-icon://attachment-photo"
      };
      return mIcons[sType ? sType.toLowerCase() : ""] || "sap-icon://attachment";
    },

    formatQuestionStatusState: function(sStatus) {
      switch (sStatus) {
        case "resolved": return "Success";
        case "closed": return "Error";
        case "open": return "Information";
        default: return "None";
      }
    },

    formatQuestionStatusText: function(sStatus) {
      switch (sStatus) {
        case "resolved": return "Résolue";
        case "closed": return "Fermée";
        case "open": return "Ouverte";
        default: return sStatus;
      }
    },

    formatVoteCount: function(iVotes) {
      if (iVotes === undefined || iVotes === null) return "0";
      return (iVotes > 0 ? "+" : "") + iVotes;
    },

    formatTagPill: function(sName, iCount) {
      return (sName || "") + " · " + (iCount || 0);
    }
  };
});
