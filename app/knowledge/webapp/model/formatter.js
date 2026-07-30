sap.ui.define([
  "sap/ui/core/format/DateFormat"
], function(DateFormat) {
  "use strict";

  // category enum (db/lot2.cds KnowledgeItems.category) -> i18n key
  var CATEGORY_KEYS = {
    article: "category.article",
    documentation: "category.documentation",
    report: "category.report",
    tutorial: "category.tutorial",
    best_practice: "category.bestPractice",
    resolved_question: "category.resolvedQuestion",
    faq: "category.faq",
    template: "category.template"
  };

  // status enum -> { i18n key, ValueState } - docs/design/Knowledge-Center.md's
  // exact mapping: Brouillon/None, En attente/Warning, Approuvé/Success, Rejeté/Error
  var STATUS_META = {
    draft: { key: "status.draft", state: "None" },
    pending: { key: "status.pending", state: "Warning" },
    approved: { key: "status.approved", state: "Success" },
    rejected: { key: "status.rejected", state: "Error" }
  };

  var oResourceBundle = null;

  // Plain module-scope functions, not object methods - a formatter invoked
  // via a composite/parts binding is NOT guaranteed to run with `this` bound
  // to this module (unlike a single-property binding), so nothing in this
  // file may rely on `this`.
  function relativeDateTime(vDate) {
    if (!vDate) return "";
    var oFormatter = DateFormat.getDateTimeInstance({ relative: true });
    return oFormatter.format(new Date(vDate));
  }

  function isNotApproved(sStatus) {
    return sStatus !== "approved";
  }

  function canSubmitForReview(sStatus) {
    return sStatus === "draft";
  }

  // A draft has never been published - nothing to comment on yet.
  function canShowComments(sStatus) {
    return sStatus !== "draft";
  }

  return {

    setResourceBundle: function(oBundle) {
      oResourceBundle = oBundle;
    },

    categoryLabel: function(sCategory) {
      if (!sCategory || !oResourceBundle) return "";
      var sKey = CATEGORY_KEYS[sCategory];
      return sKey ? oResourceBundle.getText(sKey) : sCategory;
    },

    /**
     * Status is only ever shown to the item's own author (docs/design/
     * Knowledge-Center.md: "showStatus = ownedByMe && status") - in our
     * security model any non-approved item visible at all is guaranteed
     * to belong to the caller, so `isNotApproved` doubles as that check.
     */
    statusLabel: function(sStatus) {
      if (!sStatus || !oResourceBundle) return "";
      var oMeta = STATUS_META[sStatus];
      return oMeta ? oResourceBundle.getText(oMeta.key) : sStatus;
    },

    statusState: function(sStatus) {
      var oMeta = STATUS_META[sStatus];
      return oMeta ? oMeta.state : "None";
    },

    isNotApproved: isNotApproved,
    canSubmitForReview: canSubmitForReview,
    canShowComments: canShowComments,
    relativeDateTime: relativeDateTime,

    tabButtonType: function(bActive) {
      return bActive ? "Emphasized" : "Default";
    },

    byLine: function(sContributorsLabel, vCreatedAt) {
      if (!oResourceBundle) return "";
      return oResourceBundle.getText("byLine", [sContributorsLabel || "", relativeDateTime(vCreatedAt)]);
    },

    fileSize: function(iBytes) {
      if (!iBytes) return "";
      var aSizes = ["o", "Ko", "Mo", "Go"];
      var i = Math.floor(Math.log(iBytes) / Math.log(1024));
      return Math.round((iBytes / Math.pow(1024, i)) * 10) / 10 + " " + aSizes[i];
    }
  };
});
