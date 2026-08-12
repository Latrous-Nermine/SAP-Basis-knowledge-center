sap.ui.define([
  "../BaseController",
  "../../model/knowledge/formatter",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(BaseController, formatter, MessageToast, MessageBox) {
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
      formatter.setResourceBundle(this.getResourceBundle());
      this.getRouter().getRoute("knowledgeDetail").attachPatternMatched(this._onObjectMatched, this);
    },

    _onObjectMatched: function(oEvent) {
      var sItemID = oEvent.getParameter("arguments").itemID;
      this._sItemID = sItemID;

      this.getView().bindElement({
        path: "/KnowledgeItems('" + sItemID + "')",
        model: "knowledge",
        parameters: {
          $expand: "contributors,comments,attachments"
        }
      });

      this.getViewModel().setProperty("/newCommentText", "");
      this._loadRelated(sItemID);

      // contributorsLabel isn't in the OData response - build it once the
      // element binding has data (there's no Profile service yet to show
      // display names, so user IDs are shown - see TODO-INTEGRATION.md I-16).
      var oElementBinding = this.getView().getElementBinding();
      oElementBinding.attachDataReceived(this._setContributorsLabel, this);
    },

    _setContributorsLabel: function() {
      var oData = this.getView().getBindingContext("knowledge").getObject();
      var aContributors = (oData && oData.contributors) || [];
      var sLabel = aContributors.map(function(c) { return c.user_userID; }).join(", ");
      this.getViewModel().setProperty("/contributorsLabel", sLabel);
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

    onAttachmentPress: function(oEvent) {
      var sUrl = oEvent.getSource().getBindingContext("knowledge").getProperty("fileUrl");
      if (sUrl) window.open(sUrl, "_blank");
    },

    onSubmitForReview: function() {
      var oActionContext = this.oModel.bindContext("/submitForReview")({
        itemID: this._sItemID
      });

      oActionContext.execute().then(function() {
        MessageToast.show(this.getText("submitForReviewSuccess"));
        this.getView().getElementBinding().refresh();
      }.bind(this)).catch(function(oError) {
        MessageBox.error(oError.message || this.getText("errorSubmitForReview"));
      }.bind(this));
    },

    onSubmitComment: function() {
      var sContent = this.getViewModel().getProperty("/newCommentText");
      if (!sContent || !sContent.trim()) return;

      var oActionContext = this.oModel.bindContext("/addComment")({
        itemID: this._sItemID,
        content: sContent.trim()
      });

      oActionContext.execute().then(function() {
        this.getViewModel().setProperty("/newCommentText", "");
        this.getView().getElementBinding().refresh();
      }.bind(this)).catch(function() {
        MessageBox.error(this.getText("errorAddComment"));
      }.bind(this));
    }
  });
});
