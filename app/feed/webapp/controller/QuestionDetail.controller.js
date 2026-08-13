sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "aymax/feed/service/ODataService",
  "aymax/feed/model/formatter"
], function(Controller, MessageToast, ODataService, formatter) {
  "use strict";

  return Controller.extend("aymax.feed.controller.QuestionDetail", {
    formatter: formatter,

    onInit: function() {
      this.oModel = this.getOwnerComponent().getModel("questions");
      this.oViewModel = this.getOwnerComponent().getModel("view");
      this.getOwnerComponent().getRouter().getRoute("questionDetail").attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function(oEvent) {
      this._sQuestionId = oEvent.getParameter("arguments").questionId;
      this._loadQuestionData();
    },

    _loadQuestionData: function() {
      var self = this;
      this.oModel.read("/Questions(" + this._sQuestionId + ")", {
        urlParameters: { "$expand": "author,answers" },
        success: function(oData) {
          var aAnswers = oData.answers || [];
          self.oViewModel.setProperty("/question", oData);
          self.oViewModel.setProperty("/answers", aAnswers);
          self.oViewModel.setProperty("/answersCount", oData.answerCount || aAnswers.length);
        },
        error: function() {
          MessageToast.show("Erreur lors du chargement de la question.");
        }
      });
    },

    onNavBack: function() {
      this.getOwnerComponent().getRouter().navTo("questions");
    },

    onVoteQuestionUp: function() {
      ODataService.callAction(this.oModel, "/voteQuestion", { questionID: this._sQuestionId, value: 1 }).then(function() {
        MessageToast.show("Vote pris en compte !");
        this._loadQuestionData();
      }.bind(this));
    },

    onVoteQuestionDown: function() {
      ODataService.callAction(this.oModel, "/voteQuestion", { questionID: this._sQuestionId, value: -1 }).then(function() {
        MessageToast.show("Vote pris en compte.");
        this._loadQuestionData();
      }.bind(this));
    },

    onVoteAnswerUp: function(oEvent) {
      this._voteAnswer(oEvent, 1);
    },

    onVoteAnswerDown: function(oEvent) {
      this._voteAnswer(oEvent, -1);
    },

    _voteAnswer: function(oEvent, iValue) {
      var oContext = oEvent.getSource().getBindingContext("view");
      if (!oContext) return;
      var sAnswerID = oContext.getProperty("ID");
      ODataService.callAction(this.oModel, "/voteAnswer", { answerID: sAnswerID, value: iValue }).then(function() {
        MessageToast.show("Vote pris en compte.");
        this._loadQuestionData();
      }.bind(this));
    },

    onPostAnswer: function() {
      var sText = this.oViewModel.getProperty("/newAnswerText");
      if (!sText || !sText.trim()) {
        MessageToast.show("Veuillez saisir votre réponse.");
        return;
      }

      ODataService.callAction(this.oModel, "/createAnswer", {
        questionID: this._sQuestionId,
        content: sText.trim()
      }).then(function() {
        MessageToast.show("Réponse publiée !");
        this.oViewModel.setProperty("/newAnswerText", "");
        this._loadQuestionData();
      }.bind(this));
    },

    onAcceptAnswer: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("view");
      if (!oContext) return;
      var sAnswerID = oContext.getProperty("ID");
      ODataService.callAction(this.oModel, "/acceptAnswer", {
        questionID: this._sQuestionId,
        answerID: sAnswerID
      }).then(function() {
        MessageToast.show("Réponse marquée comme meilleure réponse !");
        this._loadQuestionData();
      }.bind(this));
    },

    onResolveQuestion: function() {
      ODataService.callAction(this.oModel, "/resolveQuestion", { questionID: this._sQuestionId }).then(function() {
        MessageToast.show("Question marquée comme résolue !");
        this._loadQuestionData();
      }.bind(this));
    },

    onCloseQuestion: function() {
      ODataService.callAction(this.oModel, "/closeQuestion", { questionID: this._sQuestionId }).then(function() {
        MessageToast.show("Question fermée.");
        this._loadQuestionData();
      }.bind(this));
    }
  });
});
