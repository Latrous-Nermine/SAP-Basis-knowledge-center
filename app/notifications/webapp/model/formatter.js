sap.ui.define([
  "sap/ui/core/format/DateFormat"
], function(DateFormat) {
  "use strict";

  // Which fields of the JSON `params` blob fill the {0}/{1}… placeholders
  // in i18n key "notif.<TYPE>", in order. Keep in sync with i18n.properties
  // and with the NotificationType enum in db/lot2.cds.
  var PARAM_KEYS = {
    COMMENT: ["actorName", "title"],
    MENTION: ["actorName"],
    ANSWER_ACCEPTED: ["title"],
    ARTICLE_PUBLISHED: ["topic"],
    DOC_PUBLISHED: ["topic"],
    ROOM_POST: ["actorName", "roomName"],
    BADGE_EARNED: ["badgeName"],
    CERTIFICATION_COMPLETED: ["certificationName"],
    RECOMMENDATION: ["title"],
    VALIDATION_REQUESTED: ["title"],
    VALIDATION_RESULT: ["title", "result"],
    UPDATE_REMINDER: ["title"],
    SECURITY_EVENT: ["detail"]
  };

  var ICONS = {
    COMMENT: "sap-icon://comment",
    MENTION: "sap-icon://discussion-2",
    ANSWER_ACCEPTED: "sap-icon://accept",
    ARTICLE_PUBLISHED: "sap-icon://document-text",
    DOC_PUBLISHED: "sap-icon://document",
    ROOM_POST: "sap-icon://group",
    BADGE_EARNED: "sap-icon://badge",
    CERTIFICATION_COMPLETED: "sap-icon://certificate",
    RECOMMENDATION: "sap-icon://lightbulb",
    VALIDATION_REQUESTED: "sap-icon://request",
    VALIDATION_RESULT: "sap-icon://complete",
    UPDATE_REMINDER: "sap-icon://reminder",
    SECURITY_EVENT: "sap-icon://alert"
  };

  // Set once from Controller#onInit (getResourceBundle() needs the owner
  // component, which a plain formatter module has no access to).
  var oResourceBundle = null;

  return {

    setResourceBundle: function(oBundle) {
      oResourceBundle = oBundle;
    },

    /**
     * Builds the display sentence from `type` + the JSON `params` blob,
     * via the i18n key "notif.<TYPE>". Never reads a pre-rendered string
     * from the backend — db/lot2.cds deliberately never stores one.
     */
    notificationText: function(sType, sParamsJson) {
      if (!sType || !oResourceBundle) return "";

      var oParams = {};
      try {
        oParams = sParamsJson ? JSON.parse(sParamsJson) : {};
      } catch (e) {
        oParams = {};
      }

      var aKeys = PARAM_KEYS[sType] || [];
      var aArgs = aKeys.map(function(sKey) {
        return oParams[sKey] != null ? oParams[sKey] : "";
      });

      return oResourceBundle.getText("notif." + sType, aArgs);
    },

    notificationCategory: function(sType) {
      if (!sType || !oResourceBundle) return "";
      return oResourceBundle.getText("notif.category." + sType);
    },

    notificationIcon: function(sType) {
      return ICONS[sType] || "sap-icon://bell";
    },

    /** severity (INFO/WARNING/CRITICAL) -> sap.ui.core.Priority */
    notificationPriority: function(sSeverity) {
      switch (sSeverity) {
        case "CRITICAL": return "High";
        case "WARNING": return "Medium";
        default: return "None";
      }
    },

    relativeDateTime: function(vDate) {
      if (!vDate) return "";
      var oFormatter = DateFormat.getDateTimeInstance({ relative: true });
      return oFormatter.format(new Date(vDate));
    }
  };
});
