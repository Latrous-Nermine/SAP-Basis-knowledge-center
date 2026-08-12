sap.ui.define([
  "../BaseController",
  "../../model/excellence/formatter",
  "../../model/excellence/mock/projects",
  "sap/ui/core/Fragment",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(BaseController, formatter, aMockProjects, Fragment, JSONModel, Filter, FilterOperator, MessageToast, MessageBox) {
  "use strict";

  return BaseController.extend("aymax.hub.controller.excellence.ExcellenceCenter", {

    formatter: formatter,

    // Overrides BaseController's getResourceBundle() (which returns the
    // shell's own tiny 2-key i18n bundle) so this.getText()/formatter
    // lookups resolve against this module's real, full bundle instead.
    getResourceBundle: function() {
      return this.getOwnerComponent().getModel("i18n-excellence").getResourceBundle();
    },

    // Overrides BaseController's getViewModel() so every existing
    // this.getViewModel() call below keeps working unchanged, now pointed
    // at this module's own named model instead of the shell's shared one.
    // "excellence" (the mock project data) was already its own named model
    // in the old standalone app, unlike "view" - so only this one needed
    // renaming, not the data model itself.
    getViewModel: function() {
      return this.getOwnerComponent().getModel("view-excellence");
    },

    onInit: function() {
      formatter.setResourceBundle(this.getResourceBundle());

      // Was constructed in this module's own Component.js in the old
      // standalone app; moved here for consistency with every other
      // migrated module, where module-specific data loading lives in the
      // controller, not the shared shell's Component.js. TODO-INTEGRATION.md
      // (future): replace with a real OData model once ExcellenceCenterService
      // exists - same "projects" shape either way.
      this.getOwnerComponent().setModel(new JSONModel({ projects: aMockProjects }), "excellence");

      // Same fix, same reason, for the UI-state model: the shared manifest
      // only declares an EMPTY "view-excellence" JSONModel (it can't know
      // any module's own initial shape). This full initial state used to
      // live in this module's own Component.js and was missed when moving
      // the data model above - fclLayout being unset is exactly why the
      // FlexibleColumnLayout was rendering only one column instead of three.
      this.getOwnerComponent().setModel(new JSONModel({
        busy: false,
        fclLayout: "ThreeColumnsMidExpanded",
        selectedProjectID: null,
        selectedProject: null,
        selectedPhaseKey: null,
        selectedPhaseDetail: null,
        newDiscussionMessage: "",
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
      }), "view-excellence");

      this._selectDefaultProject();
    },

    onHomePress: function() {
      // Feed is unchanged and unmoved - still a separate app, still
      // reached the same way.
      window.location.href = "/feed/webapp/index.html";
    },

    onProjectPress: function(oEvent) {
      // A tap on a phase row also bubbles up as a press on this outer
      // project row - unlike a plain Button inside a list item (which the
      // framework knows to treat as "handled by the control itself"),
      // nesting a List/CustomListItem inside another CustomListItem isn't
      // one of those known exceptions, so it reaches here too. Without this
      // guard, clicking a phase both opened it AND collapsed its own
      // parent project in the same click.
      var oSrcControl = oEvent.getParameter("srcControl");
      if (this._isInsidePhaseList(oSrcControl)) {
        return;
      }

      var oContext = oEvent.getSource().getBindingContext("excellence");
      this._selectProject(oContext.getProperty("ID"), true);
    },

    _isInsidePhaseList: function(oControl) {
      while (oControl) {
        if (oControl.hasStyleClass && oControl.hasStyleClass("excellencePhaseList")) return true;
        oControl = oControl.getParent();
      }
      return false;
    },

    onPhasePress: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("excellence");
      // Phase rows are nested under their project in the JSON model
      // (/projects/{i}/phases/{j}) - walking the path back to /projects/{i}
      // is simpler and more robust than denormalizing a projectID onto
      // every phase just so a press handler can read it directly.
      var sPath = oContext.getPath();
      var sProjectPath = sPath.substring(0, sPath.indexOf("/phases/"));
      var sProjectID = this.getOwnerComponent().getModel("excellence").getProperty(sProjectPath + "/ID");
      var sPhaseKey = oContext.getProperty("key");

      var oViewModel = this.getViewModel();
      oViewModel.setProperty("/selectedProjectID", sProjectID);
      oViewModel.setProperty("/selectedPhaseKey", sPhaseKey);
      oViewModel.setProperty("/workspaceMode", "overview");
      this._loadSelectedPhaseDetail(sProjectID, sPhaseKey);
    },

    // Local-only: appends to the in-memory view model, nothing is
    // persisted (no backend yet - honest mock interaction, not a fake
    // success message over a real write). See TODO-INTEGRATION.md once a
    // real addDiscussionMessage-style action exists.
    onSendDiscussionMessage: function() {
      var oViewModel = this.getViewModel();
      var sMessage = (oViewModel.getProperty("/newDiscussionMessage") || "").trim();
      if (!sMessage) return;

      var aDiscussion = oViewModel.getProperty("/selectedPhaseDetail/discussion") || [];
      aDiscussion.push({
        author: this.getText("currentUserName"),
        role: this.getText("currentUserRole"),
        timestamp: new Date().toISOString(),
        message: sMessage
      });

      oViewModel.setProperty("/selectedPhaseDetail/discussion", aDiscussion);
      oViewModel.setProperty("/newDiscussionMessage", "");
    },

    // ────────────────────────────────────────────────────────────
    // Findings (Section 13) - list, filter, view detail, add.
    // Everything here is local-only: this project's mock array in memory,
    // never sent anywhere. No ExcellenceCenterService exists yet.
    // ────────────────────────────────────────────────────────────
    onShowFindings: function() {
      var oViewModel = this.getViewModel();
      oViewModel.setProperty("/workspaceMode", "findings");
      oViewModel.setProperty("/findingsSeverityFilter", "");
      oViewModel.setProperty("/findingsStatusFilter", "");
      this._applyFindingsFilter();
    },

    onBackToOverview: function() {
      this.getViewModel().setProperty("/workspaceMode", "overview");
    },

    onFindingsFilterChange: function() {
      this._applyFindingsFilter();
    },

    _applyFindingsFilter: function() {
      var oList = this.byId("findingsList");
      if (!oList || !oList.getBinding("items")) return;

      var oViewModel = this.getViewModel();
      var sSeverity = oViewModel.getProperty("/findingsSeverityFilter");
      var sStatus = oViewModel.getProperty("/findingsStatusFilter");
      var aFilters = [];
      if (sSeverity) aFilters.push(new Filter("severity", FilterOperator.EQ, sSeverity));
      if (sStatus) aFilters.push(new Filter("status", FilterOperator.EQ, sStatus));

      oList.getBinding("items").filter(aFilters);
    },

    onFindingPress: function(oEvent) {
      var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
      var oContext = oItem.getBindingContext("view-excellence");
      // Shallow copy - the dialog's own model property must not be the
      // exact same object as the list row's, or editing one would risk
      // silently corrupting the mock array through shared references.
      var oFinding = Object.assign({}, oContext.getObject());

      var oProject = this.getViewModel().getProperty("/selectedProject");
      var oRelatedRec = oFinding.recommendationID
        ? (oProject.recommendations || []).filter(function(r) { return r.ID === oFinding.recommendationID; })[0]
        : null;
      oFinding.relatedRecommendationTitle = oRelatedRec ? oRelatedRec.title : null;

      this.getViewModel().setProperty("/selectedFinding", oFinding);
      this._getFindingDetailDialog().then(function(oDialog) { oDialog.open(); });
    },

    onCloseFindingDetail: function() {
      this._getFindingDetailDialog().then(function(oDialog) { oDialog.close(); });
    },

    onAddFinding: function() {
      this.getViewModel().setProperty("/newFinding", {
        title: "", category: "technical", severity: "medium",
        observation: "", impact: "", rootCause: "", owner: ""
      });
      this._getCreateFindingDialog().then(function(oDialog) { oDialog.open(); });
    },

    onCancelNewFinding: function() {
      this._getCreateFindingDialog().then(function(oDialog) { oDialog.close(); });
    },

    onSaveNewFinding: function() {
      var oViewModel = this.getViewModel();
      var oNewFinding = oViewModel.getProperty("/newFinding");
      if (!oNewFinding.title || !oNewFinding.title.trim()) {
        MessageToast.show(this.getText("fieldTitle"));
        return;
      }

      var oProject = oViewModel.getProperty("/selectedProject");
      var sID = "F-" + (100 + oProject.findings.length + Math.floor(Math.random() * 90));

      oProject.findings.push({
        ID: sID,
        category: oNewFinding.category,
        title: oNewFinding.title.trim(),
        severity: oNewFinding.severity,
        status: "proposed",
        observation: oNewFinding.observation,
        impact: oNewFinding.impact,
        rootCause: oNewFinding.rootCause,
        contributingFactors: [],
        recommendationID: null,
        owner: oNewFinding.owner
      });

      // The list's own binding mutated in place (push) - a full model
      // refresh is what actually notifies bound controls, same as Knowledge
      // Centre's pattern for any nested-array mutation.
      oViewModel.refresh();
      MessageToast.show(this.getText("findingAdded"));
      this._getCreateFindingDialog().then(function(oDialog) { oDialog.close(); });
    },

    _getFindingDetailDialog: function() {
      return this._getDialog("_pFindingDetailDialog", "FindingDetailDialog");
    },

    _getCreateFindingDialog: function() {
      return this._getDialog("_pCreateFindingDialog", "CreateFindingDialog");
    },

    // ────────────────────────────────────────────────────────────
    // Recommendations (Section 18) - same shape as Findings above:
    // list, filter, view detail, add. Local-only, non-persisted.
    // ────────────────────────────────────────────────────────────
    onShowRecommendations: function() {
      var oViewModel = this.getViewModel();
      oViewModel.setProperty("/workspaceMode", "recommendations");
      oViewModel.setProperty("/recommendationsPriorityFilter", "");
      oViewModel.setProperty("/recommendationsStatusFilter", "");
      this._applyRecommendationsFilter();
    },

    onRecommendationsFilterChange: function() {
      this._applyRecommendationsFilter();
    },

    _applyRecommendationsFilter: function() {
      var oList = this.byId("recommendationsList");
      if (!oList || !oList.getBinding("items")) return;

      var oViewModel = this.getViewModel();
      var sPriority = oViewModel.getProperty("/recommendationsPriorityFilter");
      var sStatus = oViewModel.getProperty("/recommendationsStatusFilter");
      var aFilters = [];
      if (sPriority) aFilters.push(new Filter("priority", FilterOperator.EQ, sPriority));
      if (sStatus) aFilters.push(new Filter("status", FilterOperator.EQ, sStatus));

      oList.getBinding("items").filter(aFilters);
    },

    onRecommendationPress: function(oEvent) {
      var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
      var oContext = oItem.getBindingContext("view-excellence");
      var oRecommendation = Object.assign({}, oContext.getObject());

      var oProject = this.getViewModel().getProperty("/selectedProject");
      var oRelatedFinding = oRecommendation.relatedFindingID
        ? (oProject.findings || []).filter(function(f) { return f.ID === oRecommendation.relatedFindingID; })[0]
        : null;
      oRecommendation.relatedFindingTitle = oRelatedFinding ? oRelatedFinding.title : null;

      this.getViewModel().setProperty("/selectedRecommendation", oRecommendation);
      this._getDialog("_pRecommendationDetailDialog", "RecommendationDetailDialog").then(function(oDialog) { oDialog.open(); });
    },

    onCloseRecommendationDetail: function() {
      this._getDialog("_pRecommendationDetailDialog", "RecommendationDetailDialog").then(function(oDialog) { oDialog.close(); });
    },

    onAddRecommendation: function() {
      this.getViewModel().setProperty("/newRecommendation", {
        title: "", description: "", reason: "", expectedBenefit: "",
        priority: "medium", owner: "", targetDate: null
      });
      this._getDialog("_pCreateRecommendationDialog", "CreateRecommendationDialog").then(function(oDialog) { oDialog.open(); });
    },

    onCancelNewRecommendation: function() {
      this._getDialog("_pCreateRecommendationDialog", "CreateRecommendationDialog").then(function(oDialog) { oDialog.close(); });
    },

    onSaveNewRecommendation: function() {
      var oViewModel = this.getViewModel();
      var oNew = oViewModel.getProperty("/newRecommendation");
      if (!oNew.title || !oNew.title.trim()) {
        MessageToast.show(this.getText("fieldTitle"));
        return;
      }

      var oProject = oViewModel.getProperty("/selectedProject");
      var sID = "R-" + (100 + oProject.recommendations.length + Math.floor(Math.random() * 90));

      oProject.recommendations.push({
        ID: sID,
        title: oNew.title.trim(),
        description: oNew.description,
        reason: oNew.reason,
        expectedBenefit: oNew.expectedBenefit,
        priority: oNew.priority,
        status: "proposed",
        owner: oNew.owner,
        targetDate: oNew.targetDate,
        relatedFindingID: null
      });

      oViewModel.refresh();
      MessageToast.show(this.getText("recommendationAdded"));
      this._getDialog("_pCreateRecommendationDialog", "CreateRecommendationDialog").then(function(oDialog) { oDialog.close(); });
    },

    // ────────────────────────────────────────────────────────────
    // Action Items (Section 19) - same shape again. Local-only.
    // ────────────────────────────────────────────────────────────
    onShowActionItems: function() {
      var oViewModel = this.getViewModel();
      oViewModel.setProperty("/workspaceMode", "actionItems");
      oViewModel.setProperty("/actionItemsStatusFilter", "");
      oViewModel.setProperty("/actionItemsPriorityFilter", "");
      this._applyActionItemsFilter();
    },

    onActionItemsFilterChange: function() {
      this._applyActionItemsFilter();
    },

    _applyActionItemsFilter: function() {
      var oList = this.byId("actionItemsList");
      if (!oList || !oList.getBinding("items")) return;

      var oViewModel = this.getViewModel();
      var sStatus = oViewModel.getProperty("/actionItemsStatusFilter");
      var sPriority = oViewModel.getProperty("/actionItemsPriorityFilter");
      var aFilters = [];
      if (sStatus) aFilters.push(new Filter("status", FilterOperator.EQ, sStatus));
      if (sPriority) aFilters.push(new Filter("priority", FilterOperator.EQ, sPriority));

      oList.getBinding("items").filter(aFilters);
    },

    onActionItemPress: function(oEvent) {
      var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
      var oContext = oItem.getBindingContext("view-excellence");
      var oActionItem = Object.assign({}, oContext.getObject());

      var oProject = this.getViewModel().getProperty("/selectedProject");
      var oRelatedRec = oActionItem.relatedRecommendationID
        ? (oProject.recommendations || []).filter(function(r) { return r.ID === oActionItem.relatedRecommendationID; })[0]
        : null;
      oActionItem.relatedRecommendationTitle = oRelatedRec ? oRelatedRec.title : null;

      this.getViewModel().setProperty("/selectedActionItem", oActionItem);
      this._getDialog("_pActionItemDetailDialog", "ActionItemDetailDialog").then(function(oDialog) { oDialog.open(); });
    },

    onCloseActionItemDetail: function() {
      this._getDialog("_pActionItemDetailDialog", "ActionItemDetailDialog").then(function(oDialog) { oDialog.close(); });
    },

    onAddActionItem: function() {
      this.getViewModel().setProperty("/newActionItem", {
        title: "", owner: "", priority: "medium", status: "not_started", deadline: null
      });
      this._getDialog("_pCreateActionItemDialog", "CreateActionItemDialog").then(function(oDialog) { oDialog.open(); });
    },

    onCancelNewActionItem: function() {
      this._getDialog("_pCreateActionItemDialog", "CreateActionItemDialog").then(function(oDialog) { oDialog.close(); });
    },

    onSaveNewActionItem: function() {
      var oViewModel = this.getViewModel();
      var oNew = oViewModel.getProperty("/newActionItem");
      if (!oNew.title || !oNew.title.trim()) {
        MessageToast.show(this.getText("fieldTitle"));
        return;
      }

      var oProject = oViewModel.getProperty("/selectedProject");
      var sID = "A-" + (100 + oProject.actionItems.length + Math.floor(Math.random() * 90));

      oProject.actionItems.push({
        ID: sID,
        title: oNew.title.trim(),
        owner: oNew.owner,
        priority: oNew.priority,
        status: oNew.status,
        deadline: oNew.deadline,
        relatedRecommendationID: null
      });

      oViewModel.refresh();
      MessageToast.show(this.getText("actionItemAdded"));
      this._getDialog("_pCreateActionItemDialog", "CreateActionItemDialog").then(function(oDialog) { oDialog.close(); });
    },

    // ────────────────────────────────────────────────────────────
    // Lessons Learned (Section 20) - view only (no add form: lessons come
    // out of a review, not typed in ad hoc), plus "Create Knowledge".
    // ────────────────────────────────────────────────────────────
    onShowLessons: function() {
      this.getViewModel().setProperty("/workspaceMode", "lessons");
    },

    onLessonPress: function(oEvent) {
      var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
      var oContext = oItem.getBindingContext("view-excellence");
      this.getViewModel().setProperty("/selectedLesson", Object.assign({}, oContext.getObject()));
      this._getDialog("_pLessonDetailDialog", "LessonDetailDialog").then(function(oDialog) { oDialog.open(); });
    },

    onCloseLessonDetail: function() {
      this._getDialog("_pLessonDetailDialog", "LessonDetailDialog").then(function(oDialog) { oDialog.close(); });
    },

    // Frontend-only, exactly as scoped: this does NOT create a Knowledge
    // Centre article - there is no integration point yet (TODO-INTEGRATION.md).
    // Telling the user that plainly is the honest version of this action,
    // not a fake success toast over a write that never happened.
    onCreateKnowledge: function() {
      MessageBox.information(this.getText("createKnowledgeInfoText"), {
        title: this.getText("createKnowledgeInfoTitle")
      });
    },

    _getDialog: function(sCacheProp, sFragmentName) {
      if (!this[sCacheProp]) {
        this[sCacheProp] = Fragment.load({
          id: this.getView().getId(),
          name: "aymax.hub.view.excellence." + sFragmentName,
          controller: this
        }).then(function(oDialog) {
          this.getView().addDependent(oDialog);
          return oDialog;
        }.bind(this));
      }
      return this[sCacheProp];
    },

    _loadSelectedPhaseDetail: function(sProjectID, sPhaseKey) {
      var aProjects = this.getOwnerComponent().getModel("excellence").getProperty("/projects");
      var oProject = aProjects.filter(function(p) { return p.ID === sProjectID; })[0];
      var oPhase = oProject.phases.filter(function(ph) { return ph.key === sPhaseKey; })[0];
      var oContent = (oProject.phaseContent && oProject.phaseContent[sPhaseKey]) || {};

      this.getViewModel().setProperty("/selectedPhaseDetail", {
        key: sPhaseKey,
        state: oPhase.state,
        analysis: oContent.analysis || null,
        evidence: oContent.evidence || [],
        // .slice() - this project's own mock array must never be mutated
        // by onSendDiscussionMessage; each phase visit gets its own copy.
        discussion: (oContent.discussion || []).slice()
      });
    },

    // Opens on the first project's Overview - matches how a reviewer
    // actually starts a session (get the big picture first), rather than
    // landing on an empty workspace or jumping straight into one phase.
    _selectDefaultProject: function() {
      var aProjects = this.getOwnerComponent().getModel("excellence").getProperty("/projects");
      if (aProjects && aProjects.length) {
        this._selectProject(aProjects[0].ID, false);
      }
    },

    // bToggle: clicking the already-expanded project again collapses it.
    // Only one project's phases are ever open at a time (accordion), so
    // "expanded" and "selected" are the same value - no separate
    // expanded-set state to keep in sync.
    //
    // Selecting a project (as opposed to a specific phase) shows its
    // Overview - selectedPhaseKey stays null until the user drills into a
    // phase row. "Project selected, no phase" is a real, distinct state
    // the workspace renders (Section 10/11), not a transient in-between.
    _selectProject: function(sProjectID, bToggle) {
      var oViewModel = this.getViewModel();

      if (bToggle && oViewModel.getProperty("/selectedProjectID") === sProjectID) {
        oViewModel.setProperty("/selectedProjectID", null);
        oViewModel.setProperty("/selectedProject", null);
        oViewModel.setProperty("/selectedPhaseKey", null);
        oViewModel.setProperty("/selectedPhaseDetail", null);
        // Without this, collapsing a project while viewing e.g. its
        // Findings list left workspaceMode stale at "findings" - harmless
        // today only because every other panel's visible condition also
        // requires a selected project, which is a coincidence worth not
        // relying on rather than a real guarantee.
        oViewModel.setProperty("/workspaceMode", "overview");
        return;
      }

      var aProjects = this.getOwnerComponent().getModel("excellence").getProperty("/projects");
      var oProject = aProjects.filter(function(p) { return p.ID === sProjectID; })[0];

      oViewModel.setProperty("/selectedProjectID", sProjectID);
      oViewModel.setProperty("/selectedProject", oProject);
      oViewModel.setProperty("/selectedPhaseKey", null);
      oViewModel.setProperty("/selectedPhaseDetail", null);
      oViewModel.setProperty("/workspaceMode", "overview");
    }
  });
});
