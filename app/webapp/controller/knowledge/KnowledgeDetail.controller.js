sap.ui.define([
  "../BaseController",
  "../../model/knowledge/formatter",
  "../../model/knowledge/VotingHelper",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(BaseController, formatter, VotingHelper, MessageToast, MessageBox) {
  "use strict";

  return BaseController.extend("aymax.hub.controller.knowledge.KnowledgeDetail", {

    formatter: formatter,

    // Overrides BaseController's getResourceBundle() (which returns the
    // shell's own tiny 2-key i18n bundle) so this.getText()/formatter
    // lookups resolve against this module's real, full bundle instead.
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
      formatter.setResourceBundle(this.getResourceBundle());
      this.getRouter().getRoute("knowledgeDetail").attachPatternMatched(this._onObjectMatched, this);

      // Same server-resolved-role pattern as App.controller.js's own nav
      // guard (PeopleService#getMyRole()) - Approve/Reject are a UI hint
      // only, the real gate is approveItem/rejectItem's own
      // @requires:'Manager' (knowledge-service.cds), same as everywhere
      // else in this app (CLAUDE.md: "a disabled button is a hint").
      this.oPeopleModel.bindContext("/getMyRole()").requestObject()
        .then(function(oData) {
          this.getViewModel().setProperty("/isManager", (oData && oData.value) === "Manager");
          this._updateActionVisibility();
        }.bind(this))
        .catch(function() {
          this.getViewModel().setProperty("/isManager", false);
          this._updateActionVisibility();
        }.bind(this));
    },

    _onObjectMatched: function(oEvent) {
      var sItemID = oEvent.getParameter("arguments").itemID;
      this._sItemID = sItemID;

      this.getView().bindElement({
        path: "/KnowledgeItems('" + sItemID + "')",
        model: "knowledge",
        parameters: {
          $expand: "contributors,comments,attachments,tags($expand=tag($select=name,color)),topic"
        }
      });

      this.getViewModel().setProperty("/newCommentText", "");
      this._loadRelated(sItemID);

      // contributorsLabel isn't in the OData response - build it once the
      // element binding has data (there's no Profile service yet to show
      // display names, so user IDs are shown - see TODO-INTEGRATION.md I-16).
      // getElementBinding() needs the model name - bindElement above used
      // model:"knowledge" (a named model, not the view's default), so the
      // unnamed lookup always returned undefined (found 2026-08 via real
      // click-through testing: every single navigation into this page
      // threw here, not just a deep-link edge case).
      var oElementBinding = this.getView().getElementBinding("knowledge");
      oElementBinding.attachDataReceived(this._setContributorsLabel, this);
    },

    _setContributorsLabel: function() {
      var oData = this.getView().getBindingContext("knowledge").getObject();
      var aContributors = (oData && oData.contributors) || [];
      var sLabel = aContributors.map(function(c) { return c.displayName || c.user_userID; }).join(", ");
      this.getViewModel().setProperty("/contributorsLabel", sLabel);
      // Same dataReceived event this was already listening to (fires on
      // initial load AND every getElementBinding("knowledge").refresh(),
      // e.g. after approve/reject/submit) - the one place status is
      // guaranteed fresh, so the one place these buttons need re-deciding.
      this._updateActionVisibility();
    },

    // See the big comment on uxap:actions in the view for why this is
    // imperative instead of a declarative visible= binding.
    _updateActionVisibility: function() {
      var oContext = this.getView().getBindingContext("knowledge");
      if (!oContext) return;
      var sStatus = oContext.getProperty("status");
      var bIsManager = this.getViewModel().getProperty("/isManager") === true;
      var bCanReview = bIsManager && sStatus === "pending";

      this.byId("voteControls").setVisible(formatter.canVote(sStatus));
      this.byId("btnSubmitForReview").setVisible(formatter.canSubmitForReview(sStatus));
      this.byId("btnApproveItem").setVisible(bCanReview);
      this.byId("btnRejectItem").setVisible(bCanReview);

      // Same imperative treatment (2026-08 redesign) - headerContent and
      // ObjectPageSection turned out to share the same declarative visible=
      // unreliability as uxap:actions above, not just that aggregation.
      this.byId("statusBadge").setVisible(formatter.isNotApproved(sStatus));
      this.byId("commentsSection").setVisible(formatter.canShowComments(sStatus));

      var sTopicName = oContext.getProperty("topic/name");
      this.byId("topicChip").setVisible(!!sTopicName);
    },

    _loadRelated: function(sItemID) {
      var oContext = this.oModel.bindContext("/getRelated(itemID=" + sItemID + ")");
      oContext.requestObject().then(function(aRelated) {
        this.getViewModel().setProperty("/relatedItems", aRelated || []);
        this.getViewModel().setProperty("/hasRelatedItems", !!(aRelated && aRelated.length));
      }.bind(this)).catch(function() {
        this.getViewModel().setProperty("/relatedItems", []);
        this.getViewModel().setProperty("/hasRelatedItems", false);
      }.bind(this));
    },

    onRelatedItemPress: function(oEvent) {
      var sItemID = oEvent.getSource().getBindingContext("view-knowledge").getProperty("ID");
      this.getRouter().navTo("knowledgeDetail", { itemID: sItemID });
    },

    // fileUrl doesn't exist anymore (Knowledge Centre feature evolution,
    // 2026-08: attachments became a real OData V4 media entity - see
    // db/lot2.cds's KnowledgeAttachments). The file lives at the row's
    // own .../content stream endpoint instead of an external URL.
    onAttachmentPress: function(oEvent) {
      var sAttachmentID = oEvent.getSource().getBindingContext("knowledge").getProperty("ID");
      if (sAttachmentID) window.open("/odata/v4/knowledge/KnowledgeAttachments(" + sAttachmentID + ")/content", "_blank");
    },

    onUpvotePress: function() {
      this._onVotePress(1);
    },

    onDownvotePress: function() {
      this._onVotePress(-1);
    },

    _onVotePress: function(iValue) {
      var oContext = this.getView().getBindingContext("knowledge");
      var oDecision = VotingHelper.resolveVoteAction(oContext.getProperty("myVote"), iValue);

      var oParams = Object.assign({ itemID: this._sItemID }, oDecision.params);
      var oActionContext = this.bindAction(this.oModel, "/" + oDecision.action, oParams);

      oActionContext.execute().then(function() {
        this.getView().getElementBinding("knowledge").refresh();
      }.bind(this)).catch(function(oError) {
        MessageBox.error((oError && oError.message) || this.getText("errorVote"));
      }.bind(this));
    },

    // Approve/Reject (2026-08) - previously had no frontend at all
    // (approveItem/rejectItem existed only as backend actions, callable
    // by curl, never through this UI - the review queue in
    // KnowledgeList.view.xml's "En attente" tab let a Manager SEE
    // pending items but never decide on them).
    onApproveItem: function() {
      this._decide("approveItem", "approveItemSuccess", "errorApproveItem");
    },

    onRejectItem: function() {
      this._decide("rejectItem", "rejectItemSuccess", "errorRejectItem");
    },

    _decide: function(sAction, sSuccessKey, sErrorKey) {
      var oActionContext = this.bindAction(this.oModel, "/" + sAction, {
        itemID: this._sItemID
      });

      oActionContext.execute().then(function() {
        MessageToast.show(this.getText(sSuccessKey));
        this.getView().getElementBinding("knowledge").refresh();
      }.bind(this)).catch(function(oError) {
        MessageBox.error((oError && oError.message) || this.getText(sErrorKey));
      }.bind(this));
    },

    onSubmitForReview: function() {
      var oActionContext = this.bindAction(this.oModel, "/submitForReview", {
        itemID: this._sItemID
      });

      oActionContext.execute().then(function() {
        MessageToast.show(this.getText("submitForReviewSuccess"));
        this.getView().getElementBinding("knowledge").refresh();
      }.bind(this)).catch(function(oError) {
        MessageBox.error(oError.message || this.getText("errorSubmitForReview"));
      }.bind(this));
    },

    onSubmitComment: function() {
      var sContent = this.getViewModel().getProperty("/newCommentText");
      if (!sContent || !sContent.trim()) return;

      var oActionContext = this.bindAction(this.oModel, "/addComment", {
        itemID: this._sItemID,
        content: sContent.trim()
      });

      oActionContext.execute().then(function() {
        this.getViewModel().setProperty("/newCommentText", "");
        // Confirmed live: calling .refresh() directly on the comments
        // List's own binding throws "Refresh on this binding is not
        // supported" - `comments` only exists as part of the KnowledgeItem
        // element binding's own $expand (see _onObjectMatched), it isn't
        // an independently-refreshable binding in UI5's OData V4 model.
        // requestSideEffects() on the parent context is the model's own
        // supported API for "re-fetch this expanded nested path after an
        // action changed it server-side" - this was the actual cause of
        // every "Impossible d'ajouter le commentaire" error: the comment
        // itself always saved fine, this refresh call threw right after.
        this.getView().getBindingContext("knowledge").requestSideEffects(["comments"]);
      }.bind(this)).catch(function(oError) {
        MessageBox.error((oError && oError.message) || this.getText("errorAddComment"));
      }.bind(this));
    }
  });
});
