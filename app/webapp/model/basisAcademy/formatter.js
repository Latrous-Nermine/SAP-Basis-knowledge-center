sap.ui.define([], function() {
  "use strict";

  var ASSESSMENT_ICONS = {
    knowledge: "sap-icon://course-book",
    practical: "sap-icon://wrench",
    scenario: "sap-icon://alert",
    manager: "sap-icon://manager"
  };

  var STATUS_STATES = {
    notStarted: "None",
    inProgress: "Warning",
    validated: "Success",
    locked: "None"
  };

  return {
    assessmentTypeIcon: function(sType) {
      return ASSESSMENT_ICONS[sType] || "sap-icon://question-mark";
    },

    stepStatusState: function(sStatus) {
      return STATUS_STATES[sStatus] || "None";
    }
  };
});
