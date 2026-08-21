sap.ui.define([
  "../BaseController",
  "../../model/knowledge/formatter",
  "../../model/knowledge/VotingHelper",
  "../../model/validation/formatter",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/core/Fragment",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(BaseController, formatter, VotingHelper, validationFormatter, Filter, FilterOperator, Fragment, MessageToast, MessageBox) {
  "use strict";

  var CATEGORIES = [
    { id: "article", i18nKey: "category.article" },
    { id: "documentation", i18nKey: "category.documentation" },
    { id: "report", i18nKey: "category.report" },
    { id: "tutorial", i18nKey: "category.tutorial" },
    { id: "best_practice", i18nKey: "category.bestPractice" },
    { id: "resolved_question", i18nKey: "category.resolvedQuestion" },
    { id: "faq", i18nKey: "category.faq" },
    { id: "template", i18nKey: "category.template" }
  ];

  // Mirrors srv/domain/knowledge/AttachmentValidation.js - pre-upload UX
  // only. The backend re-validates every one of these independently and
  // is the only check that actually matters; this just avoids making the
  // user wait for a round-trip to learn a file is rejected.
  var ALLOWED_ATTACHMENT_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/png",
    "image/jpeg"
  ];
  var MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

  return BaseController.extend("aymax.hub.controller.knowledge.KnowledgeList", {

    formatter: formatter,

    // Prototype-level, not set in onInit (2026-08 fix) - XML bindings
    // resolve formatter references against the controller WHILE the view
    // is being constructed, before onInit ever runs (the same reason
    // `formatter: formatter` above is declared here and not assigned
    // inside onInit). Setting this as `this.validationFormatter = ...`
    // in onInit left every ".validationFormatter.X" binding in
    // ValidationSection.fragment.xml resolving too early, against a
    // controller that didn't have the property yet - confirmed via
    // "formatter function .validationFormatter.X not found!" console
    // errors, not assumed. onInit still does the one thing that
    // genuinely can only happen at runtime: pointing its resourceBundle
    // at i18n-validation.
    validationFormatter: validationFormatter,

    // Overrides BaseController's getResourceBundle() (which returns the
    // shell's own tiny 2-key i18n bundle) so this.getText()/formatter
    // lookups resolve against this module's real, full bundle instead -
    // missing this was why the category tabs showed raw keys like
    // "category.all" instead of translated text.
    getResourceBundle: function() {
      return this.getOwnerComponent().getModel("i18n-knowledge").getResourceBundle();
    },

    // Overrides BaseController's getViewModel() so every existing
    // this.getViewModel() call below keeps working unchanged, now pointed
    // at this module's own named model instead of the shell's shared one.
    getViewModel: function() {
      return this.getOwnerComponent().getModel("view-knowledge");
    },

    onInit: function() {
      // Was the unnamed default model in the old standalone app; now named
      // models, since one shared Component can only have one true default.
      this.oModel = this.getOwnerComponent().getModel("knowledge");
      this.oPeopleModel = this.getOwnerComponent().getModel("people");
      this.oValidationModel = this.getOwnerComponent().getModel("validation");
      formatter.setResourceBundle(this.getResourceBundle());

      // "Contenu à valider" section (2026-08, Manager only) reuses
      // Validation's own formatter module and i18n bundle directly - same
      // text/status-colour logic as the standalone Validation page, not a
      // second copy of it (this.validationFormatter itself is declared at
      // the prototype level above, not here - see that comment).
      this._oValidationBundle = this.getOwnerComponent().getModel("i18n-validation").getResourceBundle();
      validationFormatter.setResourceBundle(this._oValidationBundle);

      this._sActiveCategory = "";
      this._sSearchQuery = "";
      this._sMyKnowledgeStatus = "";
      this._sCurrentUserID = "";

      var oBundle = this.getResourceBundle();
      var aTabs = [{ id: "", label: oBundle.getText("categoryAll"), active: true }]
        .concat(CATEGORIES.map(function(c) {
          return { id: c.id, label: oBundle.getText(c.i18nKey), active: false };
        }));

      var aStatusTabs = [
        { id: "", label: oBundle.getText("myKnowledgeFilterAll"), active: true },
        { id: "approved", label: oBundle.getText("status.approved"), active: false },
        { id: "pending", label: oBundle.getText("status.pending"), active: false },
        { id: "draft", label: oBundle.getText("status.draft"), active: false }
      ];

      this.getViewModel().setProperty("/categoryTabs", aTabs);
      this.getViewModel().setProperty("/myKnowledgeStatusTabs", aStatusTabs);
      this.getViewModel().setProperty("/newItem", {});
      // Cosmetic only - the backend already defaults to "relevant"
      // ranking with no ?sort= param sent at all, so the list itself is
      // already correctly ordered before this ever needs to change.
      this.getViewModel().setProperty("/communitySortKey", "relevant");
      this.getViewModel().setProperty("/validation", {
        filterStatus: "pending",
        counts: { pending: 0, approved: 0, rejected: 0, all: 0 },
        // Collapsed by default - the section itself (and the list inside
        // it) only renders once the Manager presses the toggle button,
        // explicit request (2026-08). Counts still load eagerly below
        // regardless, so nothing has to wait on a first click.
        sectionVisible: false
      });

      // Ownership (who is "me") has to be known before either list's
      // filters can be built - My/Community only exist relative to it.
      this.oPeopleModel.bindContext("/getMyUserID()").requestObject().then(function(oData) {
        this._sCurrentUserID = (oData && oData.value) || "";
        this._applyFilters();
      }.bind(this)).catch(function() {
        // No identity resolved - both lists stay ownership-filtered to
        // "nobody", which is the safe default (never silently show
        // everything as if it were "mine").
        this._applyFilters();
      }.bind(this));

      // "Contenu à valider" section (2026-08) - Manager only, same
      // server-resolved-role pattern as KnowledgeDetail's own Approve/
      // Reject buttons and App.controller.js's nav guard. A UI hint only:
      // the real gate is validation-service.cds's own @restrict (TEAM-
      // scoped to the Manager's department), which the embedded list
      // binding goes through exactly like the standalone page did.
      this.oPeopleModel.bindContext("/getMyRole()").requestObject().then(function(oData) {
        var bIsManager = (oData && oData.value) === "Manager";
        this.getViewModel().setProperty("/isManager", bIsManager);
        if (bIsManager) {
          this._loadValidationCounts();
          this._applyValidationFilter("pending");
        }
      }.bind(this)).catch(function() {
        this.getViewModel().setProperty("/isManager", false);
      }.bind(this));
    },

    // contributors/any(...) and contributors/all(...) are real OData V4
    // lambda operators, not something UI5's plain Filter(path,op,value)
    // shape can express - PeopleService's own UserTechnologies filter
    // already relies on the same mechanism (see its own comment).
    _myKnowledgeOwnershipFilter: function() {
      return new Filter({
        path: "contributors",
        operator: "Any",
        variable: "c",
        condition: new Filter("c/user_userID", FilterOperator.EQ, this._sCurrentUserID)
      });
    },

    _communityOwnershipFilters: function() {
      return [
        new Filter("status", FilterOperator.EQ, "approved"),
        new Filter({
          path: "contributors",
          operator: "All",
          variable: "c",
          condition: new Filter("c/user_userID", FilterOperator.NE, this._sCurrentUserID)
        })
      ];
    },

    onHomePress: function() {
      // Feed is unchanged and unmoved - still a separate app, still
      // reached the same way.
      window.location.href = "/feed/webapp/index.html";
    },

    onCategoryTabPress: function(oEvent) {
      var sCategory = oEvent.getSource().getBindingContext("view-knowledge").getProperty("id");
      this._sActiveCategory = sCategory;

      var aTabs = this.getViewModel().getProperty("/categoryTabs");
      aTabs.forEach(function(t) { t.active = (t.id === sCategory); });
      this.getViewModel().setProperty("/categoryTabs", aTabs);

      this._applyFilters();
    },

    onSearch: function(oEvent) {
      this._sSearchQuery = oEvent.getParameter("newValue") || "";
      this._applyFilters();
    },

    // changeParameters() is orthogonal to .filter() (category/search below)
    // - each touches a different part of the binding's query, so neither
    // resets the other. `sort` is a plain custom query option the backend
    // reads directly (knowledge-service.js's before-READ hook) - what each
    // of the three modes actually MEANS is entirely a backend decision
    // (KnowledgeRanking.js), this handler only ever names the intent.
    onCommunitySortChange: function(oEvent) {
      var sSortKey = oEvent.getParameter("selectedItem").getKey();
      this.byId("communityKnowledgeList").getBinding("items").changeParameters({ sort: sSortKey });
    },

    onMyKnowledgeStatusPress: function(oEvent) {
      var sStatus = oEvent.getSource().getBindingContext("view-knowledge").getProperty("id");
      this._sMyKnowledgeStatus = sStatus;

      var aTabs = this.getViewModel().getProperty("/myKnowledgeStatusTabs");
      aTabs.forEach(function(t) { t.active = (t.id === sStatus); });
      this.getViewModel().setProperty("/myKnowledgeStatusTabs", aTabs);

      this._applyFilters();
    },

    // Category and search apply to both sections; the status sub-filter
    // only makes sense within My Knowledge (Community is always
    // approved-only, there is no status to choose). Processing order:
    // ownership scope (fixed per list, set once currentUserID is known)
    // -> category/search/status filters on top of it - never the other
    // way round, so a filter can never widen past what ownership allows.
    _applyFilters: function() {
      var aCommonFilters = [];
      if (this._sActiveCategory) {
        aCommonFilters.push(new Filter("category", FilterOperator.EQ, this._sActiveCategory));
      }
      if (this._sSearchQuery.trim()) {
        aCommonFilters.push(new Filter("title", FilterOperator.Contains, this._sSearchQuery.trim()));
      }

      var aMyFilters = [this._myKnowledgeOwnershipFilter()].concat(aCommonFilters);
      if (this._sMyKnowledgeStatus) {
        aMyFilters.push(new Filter("status", FilterOperator.EQ, this._sMyKnowledgeStatus));
      }
      this.byId("myKnowledgeList").getBinding("items").filter(aMyFilters);

      var aCommunityFilters = this._communityOwnershipFilters().concat(aCommonFilters);
      this.byId("communityKnowledgeList").getBinding("items").filter(aCommunityFilters);
    },

    onItemPress: function(oEvent) {
      var sItemID = oEvent.getSource().getBindingContext("knowledge").getProperty("ID");
      this.getRouter().navTo("knowledgeDetail", { itemID: sItemID });
    },

    onUpvotePress: function(oEvent) {
      this._onVotePress(oEvent, 1);
    },

    onDownvotePress: function(oEvent) {
      this._onVotePress(oEvent, -1);
    },

    // oContext.refresh() re-pulls upvoteCount/downvoteCount/votes from the
    // server rather than guessing the new numbers client-side - those
    // counters are the backend's own denormalised, transactionally-kept
    // truth (see knowledge-service.js's voteItem/removeVote), not
    // something to recompute independently here.
    _onVotePress: function(oEvent, iValue) {
      var oContext = oEvent.getSource().getBindingContext("knowledge");
      var sItemID = oContext.getProperty("ID");
      var oDecision = VotingHelper.resolveVoteAction(oContext.getProperty("myVote"), iValue);

      var oParams = Object.assign({ itemID: sItemID }, oDecision.params);
      var oActionContext = this.bindAction(this.oModel, "/" + oDecision.action, oParams);

      oActionContext.execute().then(function() {
        oContext.refresh();
      }).catch(function(oError) {
        MessageBox.error((oError && oError.message) || this.getText("errorVote"));
      }.bind(this));
    },

    onContribute: function() {
      if (!this._pDialog) {
        this._pDialog = Fragment.load({
          id: this.getView().getId(),
          name: "aymax.hub.view.knowledge.CreateItemDialog",
          controller: this
        }).then(function(oDialog) {
          this.getView().addDependent(oDialog);
          return oDialog;
        }.bind(this));
      }
      this.getViewModel().setProperty("/newItem", {
        title: "", category: "article", excerpt: "", content: "",
        pendingAttachments: [], uploading: false
      });
      this._pDialog.then(function(oDialog) { oDialog.open(); });
    },

    onCancelNewItem: function() {
      this._pDialog.then(function(oDialog) { oDialog.close(); });
    },

    // Client-side check only (UX, avoids a round-trip for an obviously
    // bad file) - the backend's before-CREATE hook on KnowledgeAttachments
    // is the actual, authoritative validation and re-checks every one of
    // these independently.
    onAttachmentFilesSelected: function(oEvent) {
      var aFiles = oEvent.getParameter("files") || [];
      var aPending = this.getViewModel().getProperty("/newItem/pendingAttachments") || [];

      Array.prototype.forEach.call(aFiles, function(oFile) {
        if (ALLOWED_ATTACHMENT_TYPES.indexOf(oFile.type) === -1) {
          MessageToast.show(this.getText("errorAttachmentType") + ": " + oFile.name);
          return;
        }
        if (oFile.size > MAX_ATTACHMENT_SIZE_BYTES) {
          MessageToast.show(this.getText("errorAttachmentSize") + ": " + oFile.name);
          return;
        }
        aPending.push({
          fileName: oFile.name,
          fileType: oFile.type,
          fileSize: oFile.size,
          _file: oFile
        });
      }.bind(this));

      this.getViewModel().setProperty("/newItem/pendingAttachments", aPending);
    },

    onRemovePendingAttachment: function(oEvent) {
      var sPath = oEvent.getSource().getBindingContext("view-knowledge").getPath();
      var iIndex = parseInt(sPath.slice(sPath.lastIndexOf("/") + 1), 10);
      var aPending = this.getViewModel().getProperty("/newItem/pendingAttachments");
      aPending.splice(iIndex, 1);
      this.getViewModel().setProperty("/newItem/pendingAttachments", aPending);
    },

    onSaveNewItem: function() {
      var oNewItem = this.getViewModel().getProperty("/newItem");
      if (!oNewItem.title || !oNewItem.title.trim()) {
        MessageToast.show(this.getText("fieldTitle"));
        return;
      }

      var oListBinding = this.oModel.bindList("/KnowledgeItems");
      var oContext = oListBinding.create({
        title: oNewItem.title,
        category: oNewItem.category,
        excerpt: oNewItem.excerpt,
        content: oNewItem.content
      });

      oContext.created().then(function() {
        var sItemID = oContext.getProperty("ID");
        return this._uploadPendingAttachments(sItemID, oNewItem.pendingAttachments || []);
      }.bind(this)).then(function() {
        MessageToast.show(this.getText("newItemCreated"));
        this._pDialog.then(function(oDialog) { oDialog.close(); });
        this._applyFilters();
      }.bind(this)).catch(function() {
        MessageBox.error(this.getText("errorCreate"));
      }.bind(this));
    },

    // The item must exist first - an attachment always needs a real
    // item_ID, and the before-CREATE contributor check on
    // KnowledgeAttachments relies on the creator already being a
    // contributor, which only becomes true once the item itself exists
    // (see knowledge-service.js's before CREATE KnowledgeItems hook).
    // Two OData operations per file, not one: a normal CREATE for the
    // metadata row (existing binding pattern, same as the item itself),
    // then a raw PUT of the bytes to that row's own media-stream endpoint
    // - UI5's declarative binding has no primitive for the second part,
    // that's simply how OData V4 media entities work.
    _uploadPendingAttachments: function(sItemID, aPendingAttachments) {
      if (!aPendingAttachments.length) return Promise.resolve();

      this.getViewModel().setProperty("/newItem/uploading", true);

      var aUploads = aPendingAttachments.map(function(oPending) {
        var oAttachmentBinding = this.oModel.bindList("/KnowledgeAttachments");
        var oAttachmentContext = oAttachmentBinding.create({
          item_ID: sItemID,
          fileName: oPending.fileName,
          fileType: oPending.fileType,
          fileSize: oPending.fileSize
        });

        return oAttachmentContext.created().then(function() {
          var sAttachmentID = oAttachmentContext.getProperty("ID");
          return fetch("/odata/v4/knowledge/KnowledgeAttachments(" + sAttachmentID + ")/content", {
            method: "PUT",
            headers: { "Content-Type": oPending.fileType },
            body: oPending._file,
            credentials: "same-origin"
          });
        }).catch(function() {
          MessageToast.show(this.getText("errorAttachmentUpload", [oPending.fileName]));
        }.bind(this));
      }.bind(this));

      return Promise.all(aUploads).finally(function() {
        this.getViewModel().setProperty("/newItem/uploading", false);
      }.bind(this));
    },

    // Visible only on drafts (see formatter.canSubmitForReview) - the
    // @restrict DELETE rule in knowledge-service.cds is the real guard,
    // this is just the matching affordance.
    onDeleteDraft: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("knowledge");
      var sTitle = oContext.getProperty("title");

      MessageBox.confirm(this.getText("deleteDraftConfirmText", [sTitle]), {
        title: this.getText("deleteDraftConfirmTitle"),
        onClose: function(sAction) {
          if (sAction !== MessageBox.Action.OK) return;

          oContext.delete().then(function() {
            MessageToast.show(this.getText("draftDeleted"));
          }.bind(this)).catch(function() {
            MessageBox.error(this.getText("errorDeleteDraft"));
          }.bind(this));
        }.bind(this)
      });
    },

    // Toggle button press - the fragment's own outer VBox requires both
    // /isManager and this to be true before it renders anything (see
    // ValidationSection.fragment.xml), so this is the only place that
    // flips the second half.
    onToggleValidationSection: function() {
      var bVisible = this.getViewModel().getProperty("/validation/sectionVisible");
      this.getViewModel().setProperty("/validation/sectionVisible", !bVisible);
    },

    // ============================================================
    // "Contenu à valider" (2026-08, Manager only) - mirrors
    // Validation.controller.js's own logic exactly (same backend calls,
    // same ValidationService), scoped under its own /validation view-model
    // path and onValidationXxx method names so nothing here collides with
    // this controller's own existing state/handlers.
    // ============================================================

    _loadValidationCounts: function() {
      var oViewModel = this.getViewModel();
      this.oValidationModel.bindContext("/getValidationCounts()").requestObject().then(function(oData) {
        oViewModel.setProperty("/validation/counts", {
          pending: oData.pending || 0,
          approved: oData.approved || 0,
          rejected: oData.rejected || 0,
          all: oData.total || 0
        });
      }).catch(function(oError) {
        console.error("Error loading ValidationCounts:", oError);
      });
    },

    _applyValidationFilter: function(sKey) {
      var oList = this.byId("validationSectionList");
      if (!oList) return;
      var oBinding = oList.getBinding("items");
      if (!oBinding) return;

      var aFilters = sKey === "all" ? [] : [new Filter("status", FilterOperator.EQ, sKey)];
      oBinding.filter(aFilters);
    },

    onValidationTabSelect: function(oEvent) {
      var sKey = oEvent.getSource().data("tab");
      this.getViewModel().setProperty("/validation/filterStatus", sKey);
      this._applyValidationFilter(sKey);
    },

    _changeValidationStatus: function(oContext, sNewStatus) {
      oContext.setProperty("status", sNewStatus);
      this.oValidationModel.submitBatch("$auto").then(function() {
        MessageToast.show(this._oValidationBundle.getText("statusUpdated", [validationFormatter.formatStatusText(sNewStatus)]));
        this._loadValidationCounts();
        this._applyValidationFilter(this.getViewModel().getProperty("/validation/filterStatus"));
      }.bind(this)).catch(function(oError) {
        MessageBox.error((oError && oError.message) || this._oValidationBundle.getText("errorUpdateStatus"));
      }.bind(this));
    },

    onValidationApprove: function(oEvent) {
      this._changeValidationStatus(oEvent.getSource().getBindingContext("validation"), "approved");
    },

    onValidationReject: function(oEvent) {
      this._changeValidationStatus(oEvent.getSource().getBindingContext("validation"), "rejected");
    },

    // Reuses the standalone Validation page's own dialog fragment as-is
    // (aymax.hub.view.validation.EditContentDialog) - it only references
    // the shared i18n-validation/validation models, nothing specific to
    // that page, so there's nothing to duplicate here.
    onValidationModify: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("validation");
      if (!this._pValidationEditDialog) {
        this._pValidationEditDialog = Fragment.load({
          id: this.getView().getId(),
          name: "aymax.hub.view.validation.EditContentDialog",
          controller: this
        }).then(function(oDialog) {
          this.getView().addDependent(oDialog);
          return oDialog;
        }.bind(this));
      }
      this._pValidationEditDialog.then(function(oDialog) {
        oDialog.setBindingContext(oContext, "validation");
        oDialog.open();
      });
    },

    // Method names fixed by EditContentDialog.fragment.xml's own
    // press=".onCancelModify"/".onConfirmModify" - same names the
    // standalone Validation controller uses for the same fragment.
    onCancelModify: function() {
      this.oValidationModel.resetChanges();
      this._pValidationEditDialog.then(function(oDialog) { oDialog.close(); });
    },

    onConfirmModify: function() {
      this.oValidationModel.submitBatch("$auto").then(function() {
        MessageToast.show(this._oValidationBundle.getText("contentUpdated"));
        this._pValidationEditDialog.then(function(oDialog) { oDialog.close(); });
      }.bind(this)).catch(function(oError) {
        MessageBox.error((oError && oError.message) || this._oValidationBundle.getText("errorUpdateContent"));
      }.bind(this));
    }
  });
});
