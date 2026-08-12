sap.ui.define([
  "sap/ui/core/format/DateFormat",
  "sap/ui/core/format/NumberFormat"
], function(DateFormat, NumberFormat) {
  "use strict";

  // review phase enum (12-phase order, Excellence Center design §9) -> i18n key
  var PHASE_NAME_KEYS = {
    context: "phase.context",
    financial: "phase.financial",
    planning: "phase.planning",
    scope: "phase.scope",
    technical: "phase.technical",
    quality: "phase.quality",
    team: "phase.team",
    client: "phase.client",
    process: "phase.process",
    findings: "phase.findings",
    recommendations: "phase.recommendations",
    lessons: "phase.lessons"
  };

  // phase.state -> { i18n key, ValueState, icon } - the four states from §9.5.
  // "current" maps to Information (blue), not Success - a phase in progress
  // is not the same thing as a phase that's done, even though both are
  // "good news" states.
  var PHASE_STATE_META = {
    completed: { key: "phaseState.completed", state: "Success", icon: "sap-icon://complete" },
    current: { key: "phaseState.current", state: "Information", icon: "sap-icon://record" },
    pending: { key: "phaseState.pending", state: "None", icon: "sap-icon://pending" },
    blocked: { key: "phaseState.blocked", state: "Error", icon: "sap-icon://error" }
  };

  var REVIEW_STATUS_META = {
    in_progress: { key: "reviewStatus.inProgress", state: "Information" },
    completed: { key: "reviewStatus.completed", state: "Success" },
    not_started: { key: "reviewStatus.notStarted", state: "None" }
  };

  // Same severity/priority ramp (high=Error, medium=Warning, low=None) used
  // independently for findings and recommendations - kept as two maps, not
  // one shared one, since a finding's severity and a recommendation's
  // priority are different concepts that only happen to share a scale today.
  var FINDING_SEVERITY_META = {
    high: { key: "severity.high", state: "Error" },
    medium: { key: "severity.medium", state: "Warning" },
    low: { key: "severity.low", state: "None" }
  };

  var FINDING_STATUS_META = {
    proposed: { key: "findingStatus.proposed", state: "None" },
    validated: { key: "findingStatus.validated", state: "Information" },
    resolved: { key: "findingStatus.resolved", state: "Success" }
  };

  var RECOMMENDATION_PRIORITY_META = {
    high: { key: "priority.high", state: "Error" },
    medium: { key: "priority.medium", state: "Warning" },
    low: { key: "priority.low", state: "None" }
  };

  var RECOMMENDATION_STATUS_META = {
    proposed: { key: "recommendationStatus.proposed", state: "None" },
    accepted: { key: "recommendationStatus.accepted", state: "Information" },
    implemented: { key: "recommendationStatus.implemented", state: "Success" }
  };

  var ACTION_STATUS_META = {
    not_started: { key: "actionStatus.notStarted", state: "None" },
    in_progress: { key: "actionStatus.inProgress", state: "Information" },
    completed: { key: "actionStatus.completed", state: "Success" },
    blocked: { key: "actionStatus.blocked", state: "Error" }
  };

  // Finding category (Section 13) - a different enum than the phase list,
  // just overlapping in name for the categories used by today's mock data.
  var FINDING_CATEGORY_KEYS = {
    financial: "category.financial",
    technical: "category.technical",
    planning: "category.planning"
  };

  var oResourceBundle = null;
  var oCurrencyFormat = NumberFormat.getCurrencyInstance({ maxFractionDigits: 0 });
  var oDateFormat = DateFormat.getDateInstance({ style: "medium" });
  var oDateTimeFormat = DateFormat.getDateTimeInstance({ relative: true });

  function metaText(oMap, sKey) {
    if (!sKey || !oResourceBundle) return "";
    var oMeta = oMap[sKey];
    return oMeta ? oResourceBundle.getText(oMeta.key) : sKey;
  }

  function metaState(oMap, sKey) {
    var oMeta = oMap[sKey];
    return oMeta ? oMeta.state : "None";
  }

  // Review-lifecycle progress: completed phases / total phases - NOT the
  // underlying project's own delivery progress (§10: "8 of 10 review phases
  // completed = 80%" never implies the project itself is 80% done).
  function reviewProgress(aPhases) {
    if (!aPhases || !aPhases.length) return 0;
    var iCompleted = aPhases.filter(function(p) { return p.state === "completed"; }).length;
    return Math.round((iCompleted / aPhases.length) * 100);
  }

  // Plain module-scope function, not a method - a formatter invoked via a
  // composite/parts binding is NOT guaranteed to run with `this` bound to
  // this module (unlike a single-property binding). Kept this way even
  // though nothing here currently calls it via `this.phaseName` anymore,
  // so the same mistake can't come back next time something needs it.
  function phaseName(sKey) {
    if (!sKey || !oResourceBundle) return "";
    var sI18nKey = PHASE_NAME_KEYS[sKey];
    return sI18nKey ? oResourceBundle.getText(sI18nKey) : sKey;
  }

  return {

    setResourceBundle: function(oBundle) { oResourceBundle = oBundle; },

    phaseName: phaseName,

    phaseStateText: function(sState) { return metaText(PHASE_STATE_META, sState); },
    phaseStateValueState: function(sState) { return metaState(PHASE_STATE_META, sState); },

    phaseStateIcon: function(sState) {
      var oMeta = PHASE_STATE_META[sState];
      return oMeta ? oMeta.icon : "sap-icon://pending";
    },

    reviewStatusText: function(sStatus) { return metaText(REVIEW_STATUS_META, sStatus); },
    reviewStatusValueState: function(sStatus) { return metaState(REVIEW_STATUS_META, sStatus); },

    findingSeverityText: function(sSeverity) { return metaText(FINDING_SEVERITY_META, sSeverity); },
    findingSeverityState: function(sSeverity) { return metaState(FINDING_SEVERITY_META, sSeverity); },
    findingStatusText: function(sStatus) { return metaText(FINDING_STATUS_META, sStatus); },
    findingStatusState: function(sStatus) { return metaState(FINDING_STATUS_META, sStatus); },

    categoryText: function(sCategory) {
      if (!sCategory || !oResourceBundle) return "";
      var sI18nKey = FINDING_CATEGORY_KEYS[sCategory];
      return sI18nKey ? oResourceBundle.getText(sI18nKey) : sCategory;
    },

    hasItems: function(aItems) {
      return !!(aItems && aItems.length);
    },

    // sap.m.Text collapses \n rather than rendering line breaks - this
    // needs sap.m.FormattedText (real HTML) in the view, not plain Text.
    bulletList: function(aItems) {
      return (aItems || []).map(function(s) { return "&bull; " + s; }).join("<br/>");
    },

    recommendationPriorityText: function(sPriority) { return metaText(RECOMMENDATION_PRIORITY_META, sPriority); },
    recommendationPriorityState: function(sPriority) { return metaState(RECOMMENDATION_PRIORITY_META, sPriority); },
    recommendationStatusText: function(sStatus) { return metaText(RECOMMENDATION_STATUS_META, sStatus); },
    recommendationStatusState: function(sStatus) { return metaState(RECOMMENDATION_STATUS_META, sStatus); },

    actionStatusText: function(sStatus) { return metaText(ACTION_STATUS_META, sStatus); },
    actionStatusState: function(sStatus) { return metaState(ACTION_STATUS_META, sStatus); },

    currency: function(nAmount) {
      return (nAmount || nAmount === 0) ? oCurrencyFormat.format(nAmount, "EUR") : "";
    },

    dateMedium: function(sDate) {
      return sDate ? oDateFormat.format(new Date(sDate)) : "";
    },

    relativeDateTime: function(sDate) {
      return sDate ? oDateTimeFormat.format(new Date(sDate)) : "";
    },

    dateRange: function(sStart, sEnd) {
      if (!sStart || !sEnd) return "";
      return oDateFormat.format(new Date(sStart)) + " – " + oDateFormat.format(new Date(sEnd));
    },

    // Same "higher than planned is unfavourable" reading applies to both
    // cost and duration in a project review, so one formatter covers both
    // Budget and Duration comparison rows rather than two near-identical ones.
    comparisonState: function(nPlanned, nActual) {
      if (nPlanned === undefined || nPlanned === null || nActual === undefined || nActual === null) return "None";
      return nActual > nPlanned ? "Error" : "Success";
    },

    durationWeeks: function(nWeeks) {
      if (!oResourceBundle || nWeeks === undefined || nWeeks === null) return "";
      return oResourceBundle.getText("weeksValue", [nWeeks]);
    },

    reviewProgress: reviewProgress,

    reviewProgressState: function(aPhases) {
      return reviewProgress(aPhases) >= 100 ? "Success" : "Information";
    },

    // Chevron reflects the accordion's own expanded/collapsed state, kept
    // as one derived boolean (expanded === selected) rather than a second
    // independent "which projects are expanded" set - see controller notes.
    expandIcon: function(sProjectID, sSelectedProjectID) {
      return sProjectID === sSelectedProjectID
        ? "sap-icon://navigation-down-arrow"
        : "sap-icon://navigation-right-arrow";
    },

    expandCollapseTooltip: function(sProjectID, sSelectedProjectID) {
      if (!oResourceBundle) return "";
      var bExpanded = sProjectID === sSelectedProjectID;
      return oResourceBundle.getText(bExpanded ? "collapseProject" : "expandProject");
    }
  };
});
