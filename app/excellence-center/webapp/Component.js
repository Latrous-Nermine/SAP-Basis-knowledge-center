sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel",
  "./model/mock/projects"
], function(UIComponent, JSONModel, aMockProjects) {
  "use strict";

  return UIComponent.extend("aymax.excellencecenter.Component", {
    metadata: {
      manifest: "json"
    },

    init: function() {
      UIComponent.prototype.init.apply(this, arguments);

      // UI-only state (what's expanded/selected) - kept separate from the
      // data model below so a future OData model can replace "excellence"
      // wholesale without touching this one.
      var oViewModel = new JSONModel({
        busy: false,
        fclLayout: "ThreeColumnsMidExpanded",
        selectedProjectID: null,
        selectedProject: null,
        selectedPhaseKey: null,
        selectedPhaseDetail: null,
        newDiscussionMessage: "",

        // Which content the mid column shows for the selected project:
        // "overview" (default), "findings", "recommendations", "actionItems"
        // or "lessons" (Sections 13/18/19/20's full lists).
        workspaceMode: "overview",

        findingsSeverityFilter: "",
        findingsStatusFilter: "",
        selectedFinding: null,
        newFinding: null,

        recommendationsPriorityFilter: "",
        recommendationsStatusFilter: "",
        selectedRecommendation: null,
        newRecommendation: null,

        actionItemsStatusFilter: "",
        actionItemsPriorityFilter: "",
        selectedActionItem: null,
        newActionItem: null,

        selectedLesson: null
      });
      this.setModel(oViewModel, "view");

      // TODO-INTEGRATION.md (future): replace with the "" OData model once
      // ExcellenceCenterService exists - same "projects" shape either way.
      var oDataModel = new JSONModel({ projects: aMockProjects });
      this.setModel(oDataModel, "excellence");
    }
  });
});
