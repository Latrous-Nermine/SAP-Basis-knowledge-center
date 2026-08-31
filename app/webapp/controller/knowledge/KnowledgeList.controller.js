sap.ui.define([
  "../BaseController",
  "../../model/knowledge/formatter",
  "../../model/knowledge/VotingHelper",
  "../../model/validation/formatter",
  "../../model/shared/TagPicker",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/json/JSONModel",
  "sap/ui/core/Fragment",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(BaseController, formatter, VotingHelper, validationFormatter, TagPicker, Filter, FilterOperator, JSONModel, Fragment, MessageToast, MessageBox) {
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
      this.oModelTags = this.getOwnerComponent().getModel("tags");
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
      this._sActiveTopic = "";

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

      this._loadCategoryCounts();
      this._loadTopics();
      // Fix (2026-08, reported: "when I want to choose a tag nothing
      // displays") - existing tags used to only ever start loading the
      // first time onContribute() ran (i.e. the first time the dialog
      // itself opened), which raced a fast click straight into the tag
      // field: showItems() had nothing to show yet, and re-triggering it
      // once the data landed turned out not to reliably reopen an
      // already-focused/already-dismissed suggestion popup (confirmed
      // live - the aggregation genuinely had all 8 tags by then,
      // suggestionItemsLen:8, the popup just never came back). Loading
      // once here instead, at the same page-init point Topics already
      // uses (_loadTopics, same reasoning), means _aAllTags is normally
      // already populated long before the dialog ever opens - the same
      // reason Topic's own picker never raced in the first place.
      this._loadAllTags();
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
      // Feed is rendered inside this shell at its own "feed" route
      // (view/feed/Feed.view.xml) - navigate via the router, not a
      // hard page load to the standalone /feed/webapp app.
      this.getRouter().navTo("feed");
    },

    // ────────────────────────────────────────────────────────────
    // Discovery surfaces (2026-08 redesign) - all three read data that
    // already existed on the backend (getCategoryCounts, Topics, the
    // "relevant" ranking) but was never surfaced in this module's own UI.
    // ────────────────────────────────────────────────────────────

    // Merges real counts onto the category tabs already built in onInit -
    // a separate call rather than building counts into onInit itself, so
    // the tabs render immediately with a count of 0 rather than waiting
    // on a round-trip before showing anything.
    _loadCategoryCounts: function() {
      this.oModel.bindContext("/getCategoryCounts()").requestObject().then(function(oData) {
        var aCounts = (oData && oData.value) || [];
        var oCountByCategory = {};
        var iTotal = 0;
        aCounts.forEach(function(c) {
          oCountByCategory[c.category] = c.count;
          iTotal += c.count;
        });

        var aTabs = this.getViewModel().getProperty("/categoryTabs");
        aTabs.forEach(function(t) {
          t.count = t.id ? (oCountByCategory[t.id] || 0) : iTotal;
        });
        this.getViewModel().setProperty("/categoryTabs", aTabs);
        this.getViewModel().setProperty("/stats/itemCount", iTotal);
      }.bind(this)).catch(function() { /* tabs still work without counts */ });
    },

    // Topics row - browsing by Topic is the one axis db/lot2.cds already
    // models (KnowledgeItems.topic, KnowledgeTopics.articleCount) but this
    // page never exposed. Read-only reference list, loaded once.
    _loadTopics: function() {
      var oTopicsModel = this.getOwnerComponent().getModel("knowledge");
      var oBinding = oTopicsModel.bindList("/Topics", null, null, [new Filter("articleCount", FilterOperator.GT, 0)]);
      oBinding.requestContexts(0, 12).then(function(aContexts) {
        // active must be a real boolean, never left undefined - a plain
        // property binding with an unresolved value falls back to the
        // CONTROL property's own default, not to false, and visible=
        // defaults to true (found 2026-08: the topic tile's "active"
        // checkmark badge showed on every tile, not just the selected
        // one, until this was explicit).
        var aTopics = aContexts.map(function(c) {
          var oTopic = c.getObject();
          oTopic.active = false;
          return oTopic;
        });
        this.getViewModel().setProperty("/topics", aTopics);
        this.getViewModel().setProperty("/stats/topicCount", aTopics.length);
        // Dialog-only copy with a leading "no topic" entry - see the
        // fragment's own comment on why this can't just be /topics.
        this.getViewModel().setProperty("/newItemTopicOptions",
          [{ ID: "", name: this.getText("fieldTopicNone") }].concat(aTopics));
      }.bind(this)).catch(function() {
        this.getViewModel().setProperty("/topics", []);
        this.getViewModel().setProperty("/newItemTopicOptions", [{ ID: "", name: this.getText("fieldTopicNone") }]);
      }.bind(this));
    },

    // Existing tags for the Contribute dialog's tag picker - loaded once
    // here (same timing as _loadTopics above), not lazily on the
    // dialog's first open, so _aAllTags is normally ready long before
    // anyone can click into the field (see onInit's own comment on the
    // race this closes).
    _loadAllTags: function() {
      TagPicker.loadAllTags(this.oModelTags).then(function(aAllTags) {
        this._aAllTags = aAllTags;
      }.bind(this));
    },

    // Both Topics and Categories now live in the rail AND (Categories only)
    // as the Bibliothèque tab's own inline chip row - either source calls
    // the same handler, so there is exactly one place that owns "which
    // filter is active" (CLAUDE.md §10: no duplicated logic). Jumping to
    // "library" is a no-op when the press came from that tab's own chip
    // row (already selected) and is what makes a RAIL click actually
    // visible when the user is on Featured/Récent/Mes connaissances -
    // without it, the filter would apply invisibly to a tab not on screen.
    _showLibraryTab: function() {
      var oTabBar = this.byId("knowledgeTabBar");
      if (oTabBar && oTabBar.getSelectedKey() !== "library") {
        oTabBar.setSelectedKey("library");
      }
    },

    // Same active-flag-on-the-array-item pattern as onCategoryTabPress
    // below, so both chip rows share the one tabButtonType formatter and
    // there's no separate "which ID is active" property to keep in sync.
    onTopicPress: function(oEvent) {
      var sTopicID = oEvent.getSource().getBindingContext("view-knowledge").getProperty("ID");
      this._sActiveTopic = (this._sActiveTopic === sTopicID) ? "" : sTopicID;

      var aTopics = this.getViewModel().getProperty("/topics");
      aTopics.forEach(function(t) { t.active = (t.ID === this._sActiveTopic); }.bind(this));
      this.getViewModel().setProperty("/topics", aTopics);

      this._applyFilters();
      if (this._sActiveTopic) this._showLibraryTab();
    },


    onCategoryTabPress: function(oEvent) {
      var sCategory = oEvent.getSource().getBindingContext("view-knowledge").getProperty("id");
      this._sActiveCategory = sCategory;

      var aTabs = this.getViewModel().getProperty("/categoryTabs");
      aTabs.forEach(function(t) { t.active = (t.id === sCategory); });
      this.getViewModel().setProperty("/categoryTabs", aTabs);

      this._applyFilters();
      if (sCategory) this._showLibraryTab();
    },

    // Fix (2026-08, reported: "search only works once I've pressed a
    // filter") - _applyFilters() only ever touches myKnowledgeList/
    // communityKnowledgeList (the two lists a search/category/topic
    // filter can meaningfully apply to - Featured/Récent are curated,
    // not filterable, by design). "Mis en avant" is the tab open by
    // default, so typing into the Hero search field with no other
    // interaction filtered lists the user couldn't see, and looked like
    // search did nothing at all. Jumping to Bibliothèque on a non-empty
    // query is the same fix already applied to onCategoryTabPress/
    // onTopicPress for the identical reason.
    onSearch: function(oEvent) {
      this._sSearchQuery = oEvent.getParameter("newValue") || "";
      this._applyFilters();
      if (this._sSearchQuery.trim()) this._showLibraryTab();
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
      if (this._sActiveTopic) {
        aCommonFilters.push(new Filter("topic_ID", FilterOperator.EQ, this._sActiveTopic));
      }
      if (this._sSearchQuery.trim()) {
        var sQuery = this._sSearchQuery.trim();
        // Matches the title OR any linked tag's name - one search box
        // covers both, rather than a second dedicated tag-filter control.
        aCommonFilters.push(new Filter({
          filters: [
            new Filter("title", FilterOperator.Contains, sQuery),
            new Filter({
              path: "tags",
              operator: "Any",
              variable: "t",
              condition: new Filter("t/tag/name", FilterOperator.Contains, sQuery)
            })
          ],
          and: false
        }));
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
        // Dedicated JSONModel for the shared TagPicker fragment, set as
        // THIS DIALOG's own default (unnamed) model - kept separate from
        // view-knowledge so it can't collide with that model's existing
        // {view-knowledge>...} prefixed bindings elsewhere in the fragment.
        this._oTagPickerModel = new JSONModel({ tags: [], suggestions: [] });
        this._pDialog = Fragment.load({
          id: this.getView().getId(),
          name: "aymax.hub.view.knowledge.CreateItemDialog",
          controller: this
        }).then(function(oDialog) {
          oDialog.setModel(this._oTagPickerModel);
          this.getView().addDependent(oDialog);
          var oTagPickerInput = this.byId("tagPickerInput");
          TagPicker.addFreeTextValidator(oTagPickerInput);
          // Fix (2026-08, reported: "I want to choose from tags that
          // already exist") - startSuggestion="0" on the fragment's own
          // MultiInput (see TagPicker.fragment.xml) only lowers the typed-
          // character threshold, it does NOT open the popup on a plain
          // focus with zero characters (confirmed live: still nothing on
          // click). showItems() is the real, public sap.m.Input API for
          // forcing the suggestion list open regardless of the current
          // value - wiring it to the control's native "focus" DOM event
          // (attachBrowserEvent, real public Control API) means clicking
          // into the empty field immediately shows the pre-loaded
          // top-used-tags list (TagPicker.filterSuggestions(aAllTags, "")
          // already populates /suggestions before the dialog opens, see
          // below) instead of requiring the user to already know a tag
          // name to type.
          // this._bTagPickerFocused tracks whether the field currently has
          // focus, so the loadAllTags().then() below (further down) knows
          // whether to also call showItems() once the data actually
          // arrives - see that block's own comment for the race this closes.
          oTagPickerInput.attachBrowserEvent("focus", function() {
            this._bTagPickerFocused = true;
            oTagPickerInput.showItems(function() { return true; });
          }.bind(this));
          oTagPickerInput.attachBrowserEvent("blur", function() {
            this._bTagPickerFocused = false;
          }.bind(this));
          return oDialog;
        }.bind(this));
      }
      this.getViewModel().setProperty("/newItem", {
        title: "", category: "article", topic_ID: "", excerpt: "", content: "",
        pendingAttachments: [], uploading: false
      });
      this._oTagPickerModel.setData({ tags: [], suggestions: [] });
      var oTagInput = this.byId("tagPickerInput");
      if (oTagInput) oTagInput.removeAllTokens();

      // Fix (2026-08, reported: "when I want to choose a tag nothing
      // displays") - loadAllTags() is a network round-trip, and on the
      // dialog's very first open (before _aAllTags is cached) a user who
      // clicks straight into the tag field can genuinely beat it there:
      // the focus-triggered showItems() above only shows whatever is
      // ALREADY in /suggestions at that instant (confirmed live - with
      // zero wait after opening the dialog, the tag field showed 0
      // items while the Topic select, whose data loads once at page
      // init rather than fresh per dialog-open, still showed all 4).
      // Re-calling showItems() here too, once the data actually lands,
      // covers exactly that case - harmless no-op if the field was never
      // focused, and a no-op re-open if it was already showing the (now
      // identical) list.
      if (!this._aAllTags) {
        TagPicker.loadAllTags(this.oModelTags).then(function(aAllTags) {
          this._aAllTags = aAllTags;
          this._oTagPickerModel.setProperty("/suggestions", TagPicker.filterSuggestions(aAllTags, ""));
          if (this._bTagPickerFocused) {
            var oTagPickerInput = this.byId("tagPickerInput");
            if (oTagPickerInput) oTagPickerInput.showItems(function() { return true; });
          }
        }.bind(this));
      } else {
        this._oTagPickerModel.setProperty("/suggestions", TagPicker.filterSuggestions(this._aAllTags, ""));
      }

      this._pDialog.then(function(oDialog) { oDialog.open(); });
    },

    onCancelNewItem: function() {
      this._pDialog.then(function(oDialog) { oDialog.close(); });
    },

    // Visual category picker (2026-08 "richer" pass) - one tile per
    // category, selection shown via each tile's own inline
    // {= .../category === 'x' ? 'Emphasized' : 'Default' } expression
    // binding against a plain JSON-model string, not a bound class= (see
    // formatter.js's own comment on why class= bindings are avoided
    // throughout this module) - and one handler per category rather than
    // a single handler reading a category off customData, since
    // core:CustomData bare-nested in a layout control's default
    // aggregation has already been confirmed to throw in this UI5
    // version (see KnowledgeCard.fragment.xml's own history on that).
    _selectCategory: function(sCategory) {
      this.getViewModel().setProperty("/newItem/category", sCategory);
    },
    onSelectCategoryArticle: function() { this._selectCategory("article"); },
    onSelectCategoryDocumentation: function() { this._selectCategory("documentation"); },
    onSelectCategoryReport: function() { this._selectCategory("report"); },
    onSelectCategoryTutorial: function() { this._selectCategory("tutorial"); },
    onSelectCategoryBestPractice: function() { this._selectCategory("best_practice"); },
    onSelectCategoryFaq: function() { this._selectCategory("faq"); },
    onSelectCategoryTemplate: function() { this._selectCategory("template"); },

    onTagPickerTokenUpdate: function(oEvent) {
      var aTags = TagPicker.applyTokenUpdate(oEvent, this._oTagPickerModel.getProperty("/tags"));
      this._oTagPickerModel.setProperty("/tags", aTags);
    },

    onTagPickerLiveChange: function(oEvent) {
      var sValue = oEvent.getParameter("value");
      this._oTagPickerModel.setProperty("/suggestions", TagPicker.filterSuggestions(this._aAllTags || [], sValue));
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

      var oPayload = {
        title: oNewItem.title,
        category: oNewItem.category,
        excerpt: oNewItem.excerpt,
        content: oNewItem.content
      };
      // Optional association - omitted entirely (not sent as "") when
      // unselected, since topic_ID is a UUID column and "" is not a
      // valid one.
      if (oNewItem.topic_ID) oPayload.topic_ID = oNewItem.topic_ID;

      var oListBinding = this.oModel.bindList("/KnowledgeItems");
      var oContext = oListBinding.create(oPayload);

      oContext.created().then(function() {
        var sItemID = oContext.getProperty("ID");
        var aTags = this._oTagPickerModel.getProperty("/tags");
        return Promise.all([
          this._uploadPendingAttachments(sItemID, oNewItem.pendingAttachments || []),
          TagPicker.linkTags(this.oModelTags, "/addTagToItem", { itemID: sItemID }, aTags)
        ]);
      }.bind(this)).then(function() {
        this._aAllTags = null; // usageCount changed - reload next time the dialog opens
        MessageToast.show(this.getText("newItemCreated"));
        this._pDialog.then(function(oDialog) { oDialog.close(); });
        // Fix (2026-08, reported: "I can't see my new contribution in Mes
        // connaissances") - _applyFilters() rebuilds the SAME Filter
        // objects (nothing about category/status/search changed), and
        // ODataListBinding#filter() with structurally-equal filters
        // doesn't refetch - confirmed live: the new draft was correctly
        // in the DB and correctly a contributor row (server-side, before-
        // CREATE hook), but stayed invisible in the UI until a full page
        // reload. myKnowledgeList's own binding needs an explicit
        // refresh() to actually re-fetch; _applyFilters() stays too, in
        // case a filter/search WAS also active when this fired.
        this._applyFilters();
        var oMyList = this.byId("myKnowledgeList").getBinding("items");
        if (oMyList) oMyList.refresh();
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
