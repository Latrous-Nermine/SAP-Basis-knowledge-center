sap.ui.define([
  "sap/ui/core/format/DateFormat",
  "../shared/notificationIcons"
], function(DateFormat, notificationIcons) {
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

  // Set once from Controller#onInit (getResourceBundle() needs the owner
  // component, which a plain formatter module has no access to).
  var oResourceBundle = null;

  function relativeDateTime(vDate) {
    if (!vDate) return "";
    var oFormatter = DateFormat.getDateTimeInstance({ relative: true });
    return oFormatter.format(new Date(vDate));
  }

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

    // NotificationListItem's own `datetime` property renders an empty
    // footer slot in practice (confirmed via inspection - the footer items
    // exist in the DOM but stay empty without an `authorName` set too), so
    // the relative time is folded into the description line instead of
    // relying on it.
    notificationMeta: function(sType, vCreatedAt) {
      if (!oResourceBundle) return "";
      var sCategory = sType ? oResourceBundle.getText("notif.category." + sType) : "";
      var sRelative = relativeDateTime(vCreatedAt);
      return sRelative ? (sCategory + " · " + sRelative) : sCategory;
    },

    notificationIcon: function(sType) {
      return notificationIcons.getIcon(sType);
    },

    /** severity (INFO/WARNING/CRITICAL) -> sap.ui.core.Priority */
    notificationPriority: function(sSeverity) {
      switch (sSeverity) {
        case "CRITICAL": return "High";
        case "WARNING": return "Medium";
        default: return "None";
      }
    },

    relativeDateTime: relativeDateTime
  };
});
