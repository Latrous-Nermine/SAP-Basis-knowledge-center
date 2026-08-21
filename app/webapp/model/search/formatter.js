sap.ui.define([], function() {
  "use strict";

  var ICON_BY_TYPE = {
    knowledge: "sap-icon://learning-assistant",
    question: "sap-icon://discussion-2",
    expert: "sap-icon://employee"
  };

  var LABEL_BY_TYPE = {
    knowledge: "Centre de connaissances",
    question: "Question",
    expert: "Expert"
  };

  var STATE_BY_TYPE = {
    knowledge: "Success",
    question: "Information",
    expert: "None"
  };

  return {
    iconForType: function(sType) {
      return ICON_BY_TYPE[sType] || "sap-icon://document";
    },
    labelForType: function(sType) {
      return LABEL_BY_TYPE[sType] || sType;
    },
    stateForType: function(sType) {
      return STATE_BY_TYPE[sType] || "None";
    }
  };
});
