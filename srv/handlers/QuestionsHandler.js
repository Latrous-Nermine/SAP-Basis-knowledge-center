import cds from '@sap/cds';

/**
 * QuestionsHandler — Style StackOverflow
 * Questions, reponses, votes, meilleure reponse, clôture, resolution
 */
export default class QuestionsHandler extends cds.ApplicationService {
  async init() {

    // ---- HOOKS AVANT ----
    this.before('CREATE', 'Questions', this._setQuestionAuthor.bind(this));
    this.before('UPDATE', 'Questions', this._checkQuestionAuthor.bind(this));
    this.before('DELETE', 'Questions', this._checkQuestionAuthor.bind(this));
    this.before('CREATE', 'Answers',   this._setAnswerAuthor.bind(this));
    this.before('UPDATE', 'Answers',   this._checkAnswerAuthor.bind(this));
    this.before('DELETE', 'Answers',   this._checkAnswerAuthor.bind(this));

    // ---- HOOKS APRES ----
    this.after('READ', 'Questions', this._enrichQuestions.bind(this));
    this.after('READ', 'Answers',   this._enrichAnswers.bind(this));

    // ---- ACTIONS QUESTIONS ----
    this.on('createQuestion',    this._createQuestion.bind(this));
    this.on('updateQuestion',    this._updateQuestion.bind(this));
    this.on('deleteQuestion',    this._deleteQuestion.bind(this));
    this.on('closeQuestion',     this._closeQuestion.bind(this));
    this.on('resolveQuestion',   this._resolveQuestion.bind(this));
    this.on('reopenQuestion',    this._reopenQuestion.bind(this));
    this.on('voteQuestion',      this._voteQuestion.bind(this));
    this.on('cancelVoteQuestion', this._cancelVoteQuestion.bind(this));

    // ---- ACTIONS REPONSES ----
    this.on('createAnswer',      this._createAnswer.bind(this));
    this.on('updateAnswer',      this._updateAnswer.bind(this));
    this.on('deleteAnswer',      this._deleteAnswer.bind(this));
    this.on('acceptAnswer',      this._acceptAnswer.bind(this));
    this.on('voteAnswer',        this._voteAnswer.bind(this));
    this.on('cancelVoteAnswer',  this._cancelVoteAnswer.bind(this));

    // ---- ACTIONS COMMENTAIRES ----
    this.on('addCommentToQuestion', this._addCommentToQuestion.bind(this));
    this.on('addCommentToAnswer',   this._addCommentToAnswer.bind(this));
    this.on('deleteComment',        this._deleteComment.bind(this));

    // ---- FONCTIONS ----
    this.on('searchQuestions',    this._searchQuestions.bind(this));
    this.on('getRelatedQuestions', this._getRelatedQuestions.bind(this));
    this.on('getMyQuestions',     this._getMyQuestions.bind(this));

    await super.init();
  }

  // ============================================================
  // UTILITAIRE
  // ============================================================
  async _ensureUserProfile(req) {
    const userID = _currentUserID(req);
    const db = cds.db;
    const exists = await db.run(SELECT.one.from('aymax.knowledgehub.UserProfiles').where({ userID }));
    if (!exists) {
      const displayName = req.user?.attr?.firstName ? `${req.user.attr.firstName} ${req.user.attr.lastName || ''}`.trim() : 'Consultant SAP';
      await db.run(INSERT.into('aymax.knowledgehub.UserProfiles').entries({
        userID,
        email:       req.user?.attr?.email || `${userID}@aymax.fr`,
        displayName,
        avatarUrl:   `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1E3A8A&color=fff`,
        department:  req.user?.attr?.department || 'SAP Basis',
        jobTitle:    req.user?.attr?.jobTitle || 'Consultant',
        reputation:  100, badgesCount: 1, isActive: true
      }));
    }
  }

  // ============================================================
  // HOOKS
  // ============================================================
  async _setQuestionAuthor(req) {
    req.data.author_userID = _currentUserID(req);
    await this._ensureUserProfile(req);
  }

  async _setAnswerAuthor(req) {
    req.data.author_userID = _currentUserID(req);
    await this._ensureUserProfile(req);
  }

  async _checkQuestionAuthor(req) {
    const qID = req.data?.ID || req.params?.[0]?.ID;
    if (!qID) return;
    const q = await SELECT.one.from(this.entities.Questions, qID, q => q.author_userID);
    if (!q) return req.reject(404, 'Question introuvable');
    const isAdmin = _hasRole(req, 'Administrator');
    if (q.author_userID !== _currentUserID(req) && !isAdmin) {
      return req.reject(403, 'Vous ne pouvez modifier que vos propres questions');
    }
  }

  async _checkAnswerAuthor(req) {
    const aID = req.data?.ID || req.params?.[0]?.ID;
    if (!aID) return;
    const a = await SELECT.one.from(this.entities.Answers, aID, a => a.author_userID);
    if (!a) return req.reject(404, 'Réponse introuvable');
    const isAdmin = _hasRole(req, 'Administrator');
    if (a.author_userID !== _currentUserID(req) && !isAdmin) {
      return req.reject(403, 'Vous ne pouvez modifier que vos propres réponses');
    }
  }

  // ============================================================
  // ENRICHISSEMENT
  // ============================================================
  async _enrichQuestions(questions, req) {
    if (!req.user || !Array.isArray(questions) || questions.length === 0) return;
    const userID = _currentUserID(req);
    const qIDs   = questions.map(q => q.ID).filter(Boolean);
    const db = cds.db;

    const userVotes = await db.run(
      SELECT.from('aymax.knowledgehub.QuestionVotes').where({ userID, question_ID: { in: qIDs } })
    );
    const voteMap = new Map(userVotes.map(v => [v.question_ID, v.value]));

    for (const q of questions) {
      const vote = voteMap.get(q.ID);
      q.isVotedByMe = !!vote;
      q.myVoteValue = vote || 0;
    }
  }

  async _enrichAnswers(answers, req) {
    if (!req.user || !Array.isArray(answers) || answers.length === 0) return;
    const userID = _currentUserID(req);
    const aIDs   = answers.map(a => a.ID).filter(Boolean);
    const db = cds.db;

    const userVotes = await db.run(
      SELECT.from('aymax.knowledgehub.AnswerVotes').where({ userID, answer_ID: { in: aIDs } })
    );
    const voteMap = new Map(userVotes.map(v => [v.answer_ID, v.value]));

    for (const a of answers) {
      const vote = voteMap.get(a.ID);
      a.isVotedByMe = !!vote;
      a.myVoteValue = vote || 0;
    }
  }

  // ============================================================
  // ACTIONS QUESTIONS
  // ============================================================
  async _createQuestion(req) {
    const { title, content, roomID, tagIDs, topicIDs } = req.data;
    if (!title?.trim()) return req.reject(400, 'Le titre est obligatoire');
    if (!content?.trim()) return req.reject(400, 'Le contenu est obligatoire');
    await this._ensureUserProfile(req);

    const qID = cds.utils.uuid();
    const db = cds.db;

    await db.run(INSERT.into('aymax.knowledgehub.Questions').entries({
      ID: qID, title: title.trim(), content: content.trim(),
      author_userID: _currentUserID(req), room_ID: roomID || null,
      status: 'open', viewCount: 0, answerCount: 0, voteCount: 0
    }));

    // Ajouter les tags
    if (tagIDs?.length) {
      for (const tagID of tagIDs) {
        await db.run(INSERT.into('aymax.knowledgehub.QuestionTags').entries({
          ID: cds.utils.uuid(), question_ID: qID, tag_ID: tagID
        }));
        await db.run(UPDATE('aymax.knowledgehub.Tags').set('usageCount +=', 1).where({ ID: tagID }));
      }
    }

    // Ajouter les topics
    if (topicIDs?.length) {
      for (const topicID of topicIDs) {
        await db.run(INSERT.into('aymax.knowledgehub.QuestionTopics').entries({
          ID: cds.utils.uuid(), question_ID: qID, topic_ID: topicID
        }));
        await db.run(UPDATE('aymax.knowledgehub.Topics').set('questionCount +=', 1).where({ ID: topicID }));
      }
    }

    return db.run(SELECT.one.from('aymax.knowledgehub.Questions').where({ ID: qID }));
  }

  async _updateQuestion(req) {
    const { questionID, title, content } = req.data;
    const q = await SELECT.one.from(this.entities.Questions).where({ ID: questionID });
    if (!q) return req.reject(404, 'Question introuvable');
    if (q.status === 'closed') return req.reject(400, 'Impossible de modifier une question clôturée');
    await UPDATE(this.entities.Questions)
      .set({ title: title || q.title, content: content || q.content })
      .where({ ID: questionID });
    return true;
  }

  async _deleteQuestion(req) {
    const { questionID } = req.data;
    const db = cds.db;
    // Retirer la reference acceptedAnswer avant de supprimer les reponses
    await UPDATE(this.entities.Questions).set({ acceptedAnswer_ID: null }).where({ ID: questionID });
    await Promise.all([
      db.run(DELETE.from('aymax.knowledgehub.QuestionTags').where({ question_ID: questionID })),
      db.run(DELETE.from('aymax.knowledgehub.QuestionTopics').where({ question_ID: questionID })),
      db.run(DELETE.from('aymax.knowledgehub.QuestionVotes').where({ question_ID: questionID })),
      db.run(DELETE.from('aymax.knowledgehub.QuestionDocuments').where({ question_ID: questionID }))
    ]);
    // Supprimer les réponses et leurs votes
    const answers = await db.run(SELECT.from('aymax.knowledgehub.Answers').where({ question_ID: questionID }));
    for (const a of answers) {
      await db.run(DELETE.from('aymax.knowledgehub.AnswerVotes').where({ answer_ID: a.ID }));
    }
    await db.run(DELETE.from('aymax.knowledgehub.Answers').where({ question_ID: questionID }));
    await DELETE.from(this.entities.Questions).where({ ID: questionID });
    return true;
  }

  async _closeQuestion(req) {
    const { questionID } = req.data;
    const isAdmin = _hasRole(req, 'Administrator', 'Manager');
    const q = await SELECT.one.from(this.entities.Questions).where({ ID: questionID });
    if (!q) return req.reject(404, 'Question introuvable');
    if (q.author_userID !== _currentUserID(req) && !isAdmin) return req.reject(403, 'Non autorisé');
    await UPDATE(this.entities.Questions).set({ status: 'closed' }).where({ ID: questionID });
    return true;
  }

  async _resolveQuestion(req) {
    const { questionID } = req.data;
    const q = await SELECT.one.from(this.entities.Questions).where({ ID: questionID });
    if (!q) return req.reject(404, 'Question introuvable');
    if (q.author_userID !== _currentUserID(req)) return req.reject(403, 'Seul l\'auteur peut marquer une question comme résolue');
    await UPDATE(this.entities.Questions).set({ status: 'resolved' }).where({ ID: questionID });
    // Ajouter points de reputation a l'auteur de la meilleure reponse
    if (q.acceptedAnswer_ID) {
      const answer = await SELECT.one.from(this.entities.Answers).where({ ID: q.acceptedAnswer_ID });
      if (answer?.author_userID) {
        const db = cds.db;
        await db.run(UPDATE('aymax.knowledgehub.UserProfiles').set('reputation +=', 15).where({ userID: answer.author_userID }));
      }
    }
    return true;
  }

  async _reopenQuestion(req) {
    const { questionID } = req.data;
    const isAdmin = _hasRole(req, 'Administrator', 'Manager');
    const q = await SELECT.one.from(this.entities.Questions).where({ ID: questionID });
    if (!q) return req.reject(404, 'Question introuvable');
    if (q.author_userID !== _currentUserID(req) && !isAdmin) return req.reject(403, 'Non autorisé');
    await UPDATE(this.entities.Questions).set({ status: 'open' }).where({ ID: questionID });
    return true;
  }

  async _voteQuestion(req) {
    const { questionID, value } = req.data;
    if (![1, -1].includes(value)) return req.reject(400, 'La valeur du vote doit être +1 ou -1');
    const userID = _currentUserID(req);
    const db = cds.db;

    // Verifier que l'auteur ne vote pas sa propre question
    const q = await SELECT.one.from(this.entities.Questions).where({ ID: questionID });
    if (!q) return req.reject(404, 'Question introuvable');
    if (q.author_userID === userID) return req.reject(400, 'Vous ne pouvez pas voter votre propre question');

    // Supprimer le vote existant si present
    const existing = await db.run(SELECT.one.from('aymax.knowledgehub.QuestionVotes').where({ question_ID: questionID, userID }));
    if (existing) {
      await db.run(DELETE.from('aymax.knowledgehub.QuestionVotes').where({ ID: existing.ID }));
      await UPDATE(this.entities.Questions).set(`voteCount -=`, existing.value).where({ ID: questionID });
    }

    // Ajouter le nouveau vote
    await db.run(INSERT.into('aymax.knowledgehub.QuestionVotes').entries({
      ID: cds.utils.uuid(), question_ID: questionID, userID, value
    }));
    await UPDATE(this.entities.Questions).set(`voteCount +=`, value).where({ ID: questionID });

    // Repercuter sur la reputation de l'auteur
    await db.run(UPDATE('aymax.knowledgehub.UserProfiles').set(`reputation +=`, value * 5).where({ userID: q.author_userID }));

    const updated = await SELECT.one.from(this.entities.Questions, questionID, q => q.voteCount);
    return updated?.voteCount || 0;
  }

  async _cancelVoteQuestion(req) {
    const { questionID } = req.data;
    const userID = _currentUserID(req);
    const db = cds.db;

    const existing = await db.run(SELECT.one.from('aymax.knowledgehub.QuestionVotes').where({ question_ID: questionID, userID }));
    if (!existing) return 0;

    await db.run(DELETE.from('aymax.knowledgehub.QuestionVotes').where({ ID: existing.ID }));
    await UPDATE(this.entities.Questions).set(`voteCount -=`, existing.value).where({ ID: questionID });

    const q = await SELECT.one.from(this.entities.Questions).where({ ID: questionID });
    if (q?.author_userID) {
      await db.run(UPDATE('aymax.knowledgehub.UserProfiles').set(`reputation -=`, existing.value * 5).where({ userID: q.author_userID }));
    }
    const updated = await SELECT.one.from(this.entities.Questions, questionID, q => q.voteCount);
    return updated?.voteCount || 0;
  }

  // ============================================================
  // ACTIONS REPONSES
  // ============================================================
  async _createAnswer(req) {
    const { questionID, content } = req.data;
    if (!content?.trim()) return req.reject(400, 'Le contenu de la réponse est obligatoire');
    await this._ensureUserProfile(req);

    const q = await SELECT.one.from(this.entities.Questions).where({ ID: questionID });
    if (!q) return req.reject(404, 'Question introuvable');
    if (q.status === 'closed') return req.reject(400, 'Impossible de répondre à une question clôturée');

    const aID = cds.utils.uuid();
    const db = cds.db;
    await db.run(INSERT.into('aymax.knowledgehub.Answers').entries({
      ID: aID, question_ID: questionID, author_userID: _currentUserID(req),
      content: content.trim(), voteCount: 0, isAccepted: false
    }));
    await UPDATE(this.entities.Questions).set('answerCount +=', 1).where({ ID: questionID });

    // Reputation +2 pour avoir repondu
    await db.run(UPDATE('aymax.knowledgehub.UserProfiles').set('reputation +=', 2).where({ userID: _currentUserID(req) }));

    return db.run(SELECT.one.from('aymax.knowledgehub.Answers').where({ ID: aID }));
  }

  async _updateAnswer(req) {
    const { answerID, content } = req.data;
    if (!content?.trim()) return req.reject(400, 'Le contenu est obligatoire');
    const a = await SELECT.one.from(this.entities.Answers).where({ ID: answerID });
    if (!a) return req.reject(404, 'Réponse introuvable');
    await UPDATE(this.entities.Answers).set({ content: content.trim() }).where({ ID: answerID });
    return true;
  }

  async _deleteAnswer(req) {
    const { answerID } = req.data;
    const db = cds.db;
    const a = await SELECT.one.from(this.entities.Answers).where({ ID: answerID });
    if (!a) return req.reject(404, 'Réponse introuvable');

    // Si c'est la meilleure reponse acceptee, retirer la reference
    if (a.isAccepted) {
      await UPDATE(this.entities.Questions).set({ acceptedAnswer_ID: null }).where({ ID: a.question_ID });
    }

    await db.run(DELETE.from('aymax.knowledgehub.AnswerVotes').where({ answer_ID: answerID }));
    await db.run(DELETE.from('aymax.knowledgehub.Comments').where({ answer_ID: answerID }));
    await DELETE.from(this.entities.Answers).where({ ID: answerID });

    if (a.question_ID) {
      await UPDATE(this.entities.Questions).set('answerCount -=', 1).where({ ID: a.question_ID });
    }
    return true;
  }

  async _acceptAnswer(req) {
    const { questionID, answerID } = req.data;
    const q = await SELECT.one.from(this.entities.Questions).where({ ID: questionID });
    if (!q) return req.reject(404, 'Question introuvable');
    const curUser = _currentUserID(req);
    if (q.author_userID !== curUser) return req.reject(403, 'Seul l\'auteur peut accepter une réponse');
    if (q.status === 'closed') return req.reject(400, 'Question clôturée');

    // Desaccepeter l'ancienne reponse si existe
    if (q.acceptedAnswer_ID) {
      await UPDATE(this.entities.Answers).set({ isAccepted: false }).where({ ID: q.acceptedAnswer_ID });
    }

    // Accepter la nouvelle
    await UPDATE(this.entities.Answers).set({ isAccepted: true }).where({ ID: answerID });
    await UPDATE(this.entities.Questions).set({ acceptedAnswer_ID: answerID }).where({ ID: questionID });

    // Bonus reputation pour l'auteur de la reponse acceptee (+10)
    const a = await SELECT.one.from(this.entities.Answers).where({ ID: answerID });
    if (a?.author_userID) {
      const db = cds.db;
      await db.run(UPDATE('aymax.knowledgehub.UserProfiles').set('reputation +=', 10).where({ userID: a.author_userID }));
    }
    return true;
  }

  async _voteAnswer(req) {
    const { answerID, value } = req.data;
    if (![1, -1].includes(value)) return req.reject(400, 'La valeur du vote doit être +1 ou -1');
    const userID = _currentUserID(req);
    const db = cds.db;

    const a = await SELECT.one.from(this.entities.Answers).where({ ID: answerID });
    if (!a) return req.reject(404, 'Réponse introuvable');
    if (a.author_userID === userID) return req.reject(400, 'Vous ne pouvez pas voter votre propre réponse');

    const existing = await db.run(SELECT.one.from('aymax.knowledgehub.AnswerVotes').where({ answer_ID: answerID, userID }));
    if (existing) {
      await db.run(DELETE.from('aymax.knowledgehub.AnswerVotes').where({ ID: existing.ID }));
      await UPDATE(this.entities.Answers).set(`voteCount -=`, existing.value).where({ ID: answerID });
    }

    await db.run(INSERT.into('aymax.knowledgehub.AnswerVotes').entries({
      ID: cds.utils.uuid(), answer_ID: answerID, userID, value
    }));
    await UPDATE(this.entities.Answers).set(`voteCount +=`, value).where({ ID: answerID });
    await db.run(UPDATE('aymax.knowledgehub.UserProfiles').set(`reputation +=`, value * 10).where({ userID: a.author_userID }));

    const updated = await SELECT.one.from(this.entities.Answers, answerID, a => a.voteCount);
    return updated?.voteCount || 0;
  }

  async _cancelVoteAnswer(req) {
    const { answerID } = req.data;
    const userID = _currentUserID(req);
    const db = cds.db;

    const existing = await db.run(SELECT.one.from('aymax.knowledgehub.AnswerVotes').where({ answer_ID: answerID, userID }));
    if (!existing) return 0;

    await db.run(DELETE.from('aymax.knowledgehub.AnswerVotes').where({ ID: existing.ID }));
    await UPDATE(this.entities.Answers).set(`voteCount -=`, existing.value).where({ ID: answerID });

    const a = await SELECT.one.from(this.entities.Answers).where({ ID: answerID });
    if (a?.author_userID) {
      await db.run(UPDATE('aymax.knowledgehub.UserProfiles').set(`reputation -=`, existing.value * 10).where({ userID: a.author_userID }));
    }
    const updated = await SELECT.one.from(this.entities.Answers, answerID, a => a.voteCount);
    return updated?.voteCount || 0;
  }

  // ============================================================
  // ACTIONS COMMENTAIRES
  // ============================================================
  async _addCommentToQuestion(req) {
    const { questionID, content } = req.data;
    if (!content?.trim()) return req.reject(400, 'Le commentaire est obligatoire');
    const db = cds.db;
    return db.run(INSERT.into('aymax.knowledgehub.Comments').entries({
      ID: cds.utils.uuid(), question_ID: questionID, author_userID: _currentUserID(req),
      content: content.trim(), likes: 0
    }));
  }

  async _addCommentToAnswer(req) {
    const { answerID, content } = req.data;
    if (!content?.trim()) return req.reject(400, 'Le commentaire est obligatoire');
    const db = cds.db;
    return db.run(INSERT.into('aymax.knowledgehub.Comments').entries({
      ID: cds.utils.uuid(), answer_ID: answerID, author_userID: _currentUserID(req),
      content: content.trim(), likes: 0
    }));
  }

  async _deleteComment(req) {
    const { commentID } = req.data;
    const db = cds.db;
    const c = await db.run(SELECT.one.from('aymax.knowledgehub.Comments').where({ ID: commentID }));
    if (!c) return req.reject(404, 'Commentaire introuvable');
    const isAdmin = _hasRole(req, 'Administrator', 'Manager');
    if (c.author_userID !== _currentUserID(req) && !isAdmin) return req.reject(403, 'Non autorisé');
    await db.run(DELETE.from('aymax.knowledgehub.Comments').where({ ID: commentID }));
    return true;
  }

  // ============================================================
  // FONCTIONS
  // ============================================================
  async _searchQuestions(req) {
    const { query, tagID, topicID, roomID, status, sortBy, limit, skip } = req.data;
    const db = cds.db;

    let q = SELECT.from('aymax.knowledgehub.Questions');

    if (status) q = q.where({ status });
    if (roomID) q = q.where({ room_ID: roomID });
    if (query) {
      const p = `%${query}%`;
      q = q.where`title like ${p} or content like ${p}`;
    }
    if (tagID)  q = q.where({ exists: SELECT.from('aymax.knowledgehub.QuestionTags').where({ tag_ID: tagID }) });
    if (topicID) q = q.where({ exists: SELECT.from('aymax.knowledgehub.QuestionTopics').where({ topic_ID: topicID }) });

    const order = sortBy === 'votes' ? { voteCount: 'desc' }
                : sortBy === 'answers' ? { answerCount: 'desc' }
                : sortBy === 'views' ? { viewCount: 'desc' }
                : { createdAt: 'desc' };

    q = q.orderBy(order).limit(limit || 20, skip || 0);
    return db.run(q);
  }

  async _getRelatedQuestions(req) {
    const { questionID, limit } = req.data;
    const db = cds.db;
    // Questions de la meme room (heuristique simple)
    const q = await db.run(SELECT.one.from('aymax.knowledgehub.Questions').where({ ID: questionID }));
    if (!q) return [];
    return db.run(
      SELECT.from('aymax.knowledgehub.Questions')
        .where({ room_ID: q.room_ID, and: [['!=', { ref: ['ID'] }, { val: questionID }]] })
        .limit(limit || 5)
        .orderBy({ createdAt: 'desc' })
    );
  }

  async _getMyQuestions(req) {
    const userID = _currentUserID(req);
    return SELECT.from(this.entities.Questions)
      .where({ author_userID: userID })
      .orderBy({ createdAt: 'desc' });
  }
}

// ============================================================
// HELPER — ID utilisateur effectif (fallback dev sans auth)
// ============================================================
function _currentUserID(req) {
  return (req.user && req.user.id && req.user.id !== 'anonymous') ? req.user.id : 'sami';
}

// ============================================================
// HELPER — Check des rôles utilisateur (compatible mocked auth)
// ============================================================
function _hasRole(req, ...roles) {
  if (!req.user) return false;
  if (typeof req.user.is === 'function') {
    return roles.some(role => req.user.is(role));
  }
  if (Array.isArray(req.user.roles)) {
    return roles.some(role => req.user.roles.includes(role));
  }
  if (req.user.roles && typeof req.user.roles === 'object') {
    return roles.some(role => !!req.user.roles[role]);
  }
  return false;
}
