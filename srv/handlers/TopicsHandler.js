import cds from '@sap/cds';

/**
 * TopicsHandler — Gestion des Topics et leurs associations
 */
export default class TopicsHandler extends cds.ApplicationService {
  async init() {

    // ---- HOOKS ----
    this.before('DELETE', 'Topics', this._checkManagerRole.bind(this));
    this.before('CREATE', 'Topics', this._checkManagerRole.bind(this));
    this.before('UPDATE', 'Topics', this._checkManagerRole.bind(this));

    this.after('DELETE', 'Topics', this._cleanupTopicAssociations.bind(this));

    // ---- ACTIONS ----
    this.on('createTopic',             this._createTopic.bind(this));
    this.on('updateTopic',             this._updateTopic.bind(this));
    this.on('deleteTopic',             this._deleteTopic.bind(this));
    this.on('addTopicToPost',          this._addTopicToPost.bind(this));
    this.on('removeTopicFromPost',     this._removeTopicFromPost.bind(this));
    this.on('addTopicToRoom',          this._addTopicToRoom.bind(this));
    this.on('removeTopicFromRoom',     this._removeTopicFromRoom.bind(this));
    this.on('addTopicToQuestion',      this._addTopicToQuestion.bind(this));
    this.on('removeTopicFromQuestion', this._removeTopicFromQuestion.bind(this));

    // ---- FONCTIONS ----
    this.on('getTopicStats',    this._getTopicStats.bind(this));
    this.on('getPopularTopics', this._getPopularTopics.bind(this));

    await super.init();
  }

  // ============================================================
  // HOOKS
  // ============================================================
  async _checkManagerRole(req) {
    if (!req.user || req.user.id === 'anonymous') return; // mode dev sans auth
    const isManager = req.user?.roles?.includes('Manager') || req.user?.roles?.includes('Admin');
    if (!isManager) return req.reject(403, 'Seuls les Managers peuvent gérer les Topics');
  }

  async _cleanupTopicAssociations(topic, req) {
    const db = cds.db;
    if (!topic?.ID) return;
    await Promise.all([
      db.run(DELETE.from('aymax.knowledgehub.PostTopics').where({ topic_ID: topic.ID })),
      db.run(DELETE.from('aymax.knowledgehub.RoomTopics').where({ topic_ID: topic.ID })),
      db.run(DELETE.from('aymax.knowledgehub.QuestionTopics').where({ topic_ID: topic.ID }))
    ]);
  }

  // ============================================================
  // ACTIONS
  // ============================================================
  async _createTopic(req) {
    const { name, description, color, icon } = req.data;
    if (!name?.trim()) return req.reject(400, 'Le nom du topic est obligatoire');
    const id = cds.utils.uuid();
    await INSERT.into(this.entities.Topics).entries({
      ID: id, name: name.trim(), description: description || '',
      color: color || '#1E3A8A', icon: icon || 'sap-icon://tag',
      postCount: 0, questionCount: 0, roomCount: 0
    });
    return SELECT.one.from(this.entities.Topics).where({ ID: id });
  }

  async _updateTopic(req) {
    const { topicID, name, description, color, icon } = req.data;
    if (!topicID) return req.reject(400, 'topicID obligatoire');
    const topic = await SELECT.one.from(this.entities.Topics).where({ ID: topicID });
    if (!topic) return req.reject(404, 'Topic introuvable');
    await UPDATE(this.entities.Topics)
      .set({ name: name || topic.name, description: description ?? topic.description,
             color: color || topic.color, icon: icon || topic.icon })
      .where({ ID: topicID });
    return true;
  }

  async _deleteTopic(req) {
    const { topicID } = req.data;
    if (!topicID) return req.reject(400, 'topicID obligatoire');
    const db = cds.db;
    await Promise.all([
      db.run(DELETE.from('aymax.knowledgehub.PostTopics').where({ topic_ID: topicID })),
      db.run(DELETE.from('aymax.knowledgehub.RoomTopics').where({ topic_ID: topicID })),
      db.run(DELETE.from('aymax.knowledgehub.QuestionTopics').where({ topic_ID: topicID }))
    ]);
    await DELETE.from(this.entities.Topics).where({ ID: topicID });
    return true;
  }

  async _addTopicToPost(req) {
    const { topicID, postID } = req.data;
    const db = cds.db;
    const existing = await db.run(SELECT.one.from('aymax.knowledgehub.PostTopics').where({ topic_ID: topicID, post_ID: postID }));
    if (existing) return false;
    await db.run(INSERT.into('aymax.knowledgehub.PostTopics').entries({ ID: cds.utils.uuid(), topic_ID: topicID, post_ID: postID }));
    await UPDATE(this.entities.Topics).set('postCount +=', 1).where({ ID: topicID });
    return true;
  }

  async _removeTopicFromPost(req) {
    const { topicID, postID } = req.data;
    const db = cds.db;
    const existing = await db.run(SELECT.one.from('aymax.knowledgehub.PostTopics').where({ topic_ID: topicID, post_ID: postID }));
    if (!existing) return false;
    await db.run(DELETE.from('aymax.knowledgehub.PostTopics').where({ ID: existing.ID }));
    await UPDATE(this.entities.Topics).set('postCount -=', 1).where({ ID: topicID });
    return true;
  }

  async _addTopicToRoom(req) {
    const { topicID, roomID } = req.data;
    const db = cds.db;
    const existing = await db.run(SELECT.one.from('aymax.knowledgehub.RoomTopics').where({ topic_ID: topicID, room_ID: roomID }));
    if (existing) return false;
    await db.run(INSERT.into('aymax.knowledgehub.RoomTopics').entries({ ID: cds.utils.uuid(), topic_ID: topicID, room_ID: roomID }));
    await UPDATE(this.entities.Topics).set('roomCount +=', 1).where({ ID: topicID });
    return true;
  }

  async _removeTopicFromRoom(req) {
    const { topicID, roomID } = req.data;
    const db = cds.db;
    const existing = await db.run(SELECT.one.from('aymax.knowledgehub.RoomTopics').where({ topic_ID: topicID, room_ID: roomID }));
    if (!existing) return false;
    await db.run(DELETE.from('aymax.knowledgehub.RoomTopics').where({ ID: existing.ID }));
    await UPDATE(this.entities.Topics).set('roomCount -=', 1).where({ ID: topicID });
    return true;
  }

  async _addTopicToQuestion(req) {
    const { topicID, questionID } = req.data;
    const db = cds.db;
    const existing = await db.run(SELECT.one.from('aymax.knowledgehub.QuestionTopics').where({ topic_ID: topicID, question_ID: questionID }));
    if (existing) return false;
    await db.run(INSERT.into('aymax.knowledgehub.QuestionTopics').entries({ ID: cds.utils.uuid(), topic_ID: topicID, question_ID: questionID }));
    await UPDATE(this.entities.Topics).set('questionCount +=', 1).where({ ID: topicID });
    return true;
  }

  async _removeTopicFromQuestion(req) {
    const { topicID, questionID } = req.data;
    const db = cds.db;
    const existing = await db.run(SELECT.one.from('aymax.knowledgehub.QuestionTopics').where({ topic_ID: topicID, question_ID: questionID }));
    if (!existing) return false;
    await db.run(DELETE.from('aymax.knowledgehub.QuestionTopics').where({ ID: existing.ID }));
    await UPDATE(this.entities.Topics).set('questionCount -=', 1).where({ ID: topicID });
    return true;
  }

  // ============================================================
  // FONCTIONS
  // ============================================================
  async _getTopicStats(req) {
    const { topicID } = req.data;
    return SELECT.one.from(this.entities.Topics).where({ ID: topicID });
  }

  async _getPopularTopics(req) {
    const { limit } = req.data;
    return SELECT.from(this.entities.Topics)
      .orderBy({ postCount: 'desc', questionCount: 'desc' })
      .limit(limit || 10);
  }
}
