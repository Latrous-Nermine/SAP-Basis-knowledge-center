import cds from '@sap/cds';

/**
 * TagsHandler — Gestion des Tags, fusion, associations et popularite
 */
export default class TagsHandler extends cds.ApplicationService {
  async init() {

    // ---- HOOKS ----
    this.before('DELETE', 'Tags', this._checkManagerRole.bind(this));
    this.after('DELETE',  'Tags', this._cleanupTagAssociations.bind(this));

    // ---- ACTIONS ----
    this.on('createTag',           this._createTag.bind(this));
    this.on('updateTag',           this._updateTag.bind(this));
    this.on('deleteTag',           this._deleteTag.bind(this));
    this.on('mergeTags',           this._mergeTags.bind(this));
    this.on('addTagToPost',        this._addTagToPost.bind(this));
    this.on('removeTagFromPost',   this._removeTagFromPost.bind(this));
    this.on('addTagToQuestion',    this._addTagToQuestion.bind(this));
    this.on('removeTagFromQuestion', this._removeTagFromQuestion.bind(this));

    // ---- FONCTIONS ----
    this.on('searchTags',    this._searchTags.bind(this));
    this.on('getTrendingTags', this._getTrendingTags.bind(this));
    this.on('getTagStats',   this._getTagStats.bind(this));

    await super.init();
  }

  // ============================================================
  // HOOKS
  // ============================================================
  async _checkManagerRole(req) {
    if (!req.user || req.user.id === 'anonymous') return; // mode dev sans auth
    const isManager = req.user?.roles?.includes('Manager') || req.user?.roles?.includes('Admin');
    if (!isManager) return req.reject(403, 'Seuls les Managers peuvent supprimer des Tags');
  }

  async _cleanupTagAssociations(tag) {
    if (!tag?.ID) return;
    const db = cds.db;
    await Promise.all([
      db.run(DELETE.from('aymax.knowledgehub.PostTags').where({ tag_ID: tag.ID })),
      db.run(DELETE.from('aymax.knowledgehub.QuestionTags').where({ tag_ID: tag.ID }))
    ]);
  }

  // ============================================================
  // ACTIONS
  // ============================================================
  async _createTag(req) {
    const { name, color, icon, description } = req.data;
    if (!name?.trim()) return req.reject(400, 'Le nom du tag est obligatoire');
    // Verifier unicite
    const existing = await SELECT.one.from(this.entities.Tags).where({ name: name.trim() });
    if (existing) return req.reject(409, `Le tag "${name}" existe déjà`);

    const id = cds.utils.uuid();
    await INSERT.into(this.entities.Tags).entries({
      ID: id, name: name.trim(), color: color || '#1E3A8A',
      icon: icon || '', description: description || '', usageCount: 0
    });
    return SELECT.one.from(this.entities.Tags).where({ ID: id });
  }

  async _updateTag(req) {
    const { tagID, name, color, icon, description } = req.data;
    if (!tagID) return req.reject(400, 'tagID obligatoire');
    const tag = await SELECT.one.from(this.entities.Tags).where({ ID: tagID });
    if (!tag) return req.reject(404, 'Tag introuvable');
    await UPDATE(this.entities.Tags)
      .set({ name: name || tag.name, color: color || tag.color,
             icon: icon ?? tag.icon, description: description ?? tag.description })
      .where({ ID: tagID });
    return true;
  }

  async _deleteTag(req) {
    const { tagID } = req.data;
    const db = cds.db;
    await Promise.all([
      db.run(DELETE.from('aymax.knowledgehub.PostTags').where({ tag_ID: tagID })),
      db.run(DELETE.from('aymax.knowledgehub.QuestionTags').where({ tag_ID: tagID }))
    ]);
    await DELETE.from(this.entities.Tags).where({ ID: tagID });
    return true;
  }

  async _mergeTags(req) {
    /**
     * Fusion : reassigner tous les PostTags/QuestionTags de sourceTagID vers targetTagID
     * puis supprimer sourceTagID
     */
    const { sourceTagID, targetTagID } = req.data;
    if (!sourceTagID || !targetTagID) return req.reject(400, 'sourceTagID et targetTagID obligatoires');
    if (sourceTagID === targetTagID) return req.reject(400, 'Les deux tags doivent etre differents');

    const [source, target] = await Promise.all([
      SELECT.one.from(this.entities.Tags).where({ ID: sourceTagID }),
      SELECT.one.from(this.entities.Tags).where({ ID: targetTagID })
    ]);
    if (!source) return req.reject(404, 'Tag source introuvable');
    if (!target) return req.reject(404, 'Tag cible introuvable');

    const db = cds.db;

    // Reassigner PostTags (eviter les doublons)
    const sourcePostTags = await db.run(SELECT.from('aymax.knowledgehub.PostTags').where({ tag_ID: sourceTagID }));
    for (const pt of sourcePostTags) {
      const dup = await db.run(SELECT.one.from('aymax.knowledgehub.PostTags').where({ tag_ID: targetTagID, post_ID: pt.post_ID }));
      if (dup) {
        await db.run(DELETE.from('aymax.knowledgehub.PostTags').where({ ID: pt.ID }));
      } else {
        await db.run(UPDATE('aymax.knowledgehub.PostTags').set({ tag_ID: targetTagID }).where({ ID: pt.ID }));
      }
    }

    // Reassigner QuestionTags
    const sourceQTags = await db.run(SELECT.from('aymax.knowledgehub.QuestionTags').where({ tag_ID: sourceTagID }));
    for (const qt of sourceQTags) {
      const dup = await db.run(SELECT.one.from('aymax.knowledgehub.QuestionTags').where({ tag_ID: targetTagID, question_ID: qt.question_ID }));
      if (dup) {
        await db.run(DELETE.from('aymax.knowledgehub.QuestionTags').where({ ID: qt.ID }));
      } else {
        await db.run(UPDATE('aymax.knowledgehub.QuestionTags').set({ tag_ID: targetTagID }).where({ ID: qt.ID }));
      }
    }

    // Mettre a jour le compteur du tag cible
    const newCount = (source.usageCount || 0) + (target.usageCount || 0);
    await UPDATE(this.entities.Tags).set({ usageCount: newCount }).where({ ID: targetTagID });

    // Supprimer le tag source
    await DELETE.from(this.entities.Tags).where({ ID: sourceTagID });
    return true;
  }

  async _addTagToPost(req) {
    const { tagID, postID } = req.data;
    const db = cds.db;
    const existing = await db.run(SELECT.one.from('aymax.knowledgehub.PostTags').where({ tag_ID: tagID, post_ID: postID }));
    if (existing) return false;
    await db.run(INSERT.into('aymax.knowledgehub.PostTags').entries({ ID: cds.utils.uuid(), tag_ID: tagID, post_ID: postID }));
    await UPDATE(this.entities.Tags).set('usageCount +=', 1).where({ ID: tagID });
    return true;
  }

  async _removeTagFromPost(req) {
    const { tagID, postID } = req.data;
    const db = cds.db;
    const existing = await db.run(SELECT.one.from('aymax.knowledgehub.PostTags').where({ tag_ID: tagID, post_ID: postID }));
    if (!existing) return false;
    await db.run(DELETE.from('aymax.knowledgehub.PostTags').where({ ID: existing.ID }));
    await UPDATE(this.entities.Tags).set('usageCount -=', 1).where({ ID: tagID });
    return true;
  }

  async _addTagToQuestion(req) {
    const { tagID, questionID } = req.data;
    const db = cds.db;
    const existing = await db.run(SELECT.one.from('aymax.knowledgehub.QuestionTags').where({ tag_ID: tagID, question_ID: questionID }));
    if (existing) return false;
    await db.run(INSERT.into('aymax.knowledgehub.QuestionTags').entries({ ID: cds.utils.uuid(), tag_ID: tagID, question_ID: questionID }));
    await UPDATE(this.entities.Tags).set('usageCount +=', 1).where({ ID: tagID });
    return true;
  }

  async _removeTagFromQuestion(req) {
    const { tagID, questionID } = req.data;
    const db = cds.db;
    const existing = await db.run(SELECT.one.from('aymax.knowledgehub.QuestionTags').where({ tag_ID: tagID, question_ID: questionID }));
    if (!existing) return false;
    await db.run(DELETE.from('aymax.knowledgehub.QuestionTags').where({ ID: existing.ID }));
    await UPDATE(this.entities.Tags).set('usageCount -=', 1).where({ ID: tagID });
    return true;
  }

  // ============================================================
  // FONCTIONS
  // ============================================================
  async _searchTags(req) {
    const { query } = req.data;
    if (!query) return SELECT.from(this.entities.Tags).orderBy({ usageCount: 'desc' }).limit(20);
    return SELECT.from(this.entities.Tags)
      .where({ name: { like: `%${query}%` } })
      .orderBy({ usageCount: 'desc' })
      .limit(20);
  }

  async _getTrendingTags(req) {
    const { limit } = req.data;
    return SELECT.from(this.entities.Tags).orderBy({ usageCount: 'desc' }).limit(limit || 10);
  }

  async _getTagStats(req) {
    const { tagID } = req.data;
    return SELECT.one.from(this.entities.Tags).where({ ID: tagID });
  }
}
