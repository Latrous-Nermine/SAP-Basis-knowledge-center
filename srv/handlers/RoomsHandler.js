import cds from '@sap/cds';

/**
 * RoomsHandler — Gestion des Rooms, membres, stages et historique des transitions
 */
export default class RoomsHandler extends cds.ApplicationService {
  async init() {

    // ---- HOOKS ----
    this.before('CREATE', 'Rooms', this._setRoomOwner.bind(this));
    this.after('CREATE', 'Rooms', this._assignRoomOwner.bind(this));
    this.before('UPDATE', 'Rooms', this._checkRoomManager.bind(this));
    this.before('DELETE', 'Rooms', this._checkRoomManager.bind(this));

    this.after('READ', 'Rooms', this._enrichRooms.bind(this));

    // ---- ACTIONS MEMBRES ----
    this.on('joinRoom',        this._joinRoom.bind(this));
    this.on('leaveRoom',       this._leaveRoom.bind(this));
    this.on('inviteMember',    this._inviteMember.bind(this));
    this.on('removeMember',    this._removeMember.bind(this));
    this.on('updateMemberRole', this._updateMemberRole.bind(this));

    // ---- ACTIONS STAGES ----
    this.on('changePostStage', this._changePostStage.bind(this));
    this.on('createStage',     this._createStage.bind(this));
    this.on('updateStage',     this._updateStage.bind(this));
    this.on('deleteStage',     this._deleteStage.bind(this));

    // ---- FONCTIONS ----
    this.on('getRoomStats',    this._getRoomStats.bind(this));
    this.on('getMyRooms',      this._getMyRooms.bind(this));
    this.on('getStageHistory', this._getStageHistory.bind(this));

    await super.init();
  }

  // ============================================================
  // UTILITAIRES
  // ============================================================
  async _ensureUserProfile(userID, req) {
    const db = cds.db;
    const exists = await db.run(SELECT.one.from('aymax.knowledgehub.UserProfiles').where({ userID }));
    if (!exists && req) {
      await db.run(INSERT.into('aymax.knowledgehub.UserProfiles').entries({
        userID,
        email:       req.user.attr?.email       || userID,
        displayName: `${req.user.attr?.firstName || ''} ${req.user.attr?.lastName || ''}`.trim() || 'Utilisateur',
        department:  req.user.attr?.department  || 'SAP',
        jobTitle:    req.user.attr?.jobTitle    || 'Consultant',
        reputation:  0, badgesCount: 0, isActive: true
      }));
    }
  }

  async _isMemberOfRoom(roomID, userID) {
    const db = cds.db;
    return db.run(SELECT.one.from('aymax.knowledgehub.RoomMembers').where({ room_ID: roomID, userID }));
  }

  async _isRoomAdmin(roomID, userID) {
    const member = await this._isMemberOfRoom(roomID, userID);
    return member && (member.role === 'owner' || member.role === 'admin');
  }

  // ============================================================
  // HOOKS
  // ============================================================
  async _setRoomOwner(req) {
    const userID = (req.user && req.user.id && req.user.id !== 'anonymous') ? req.user.id : 'sami';
    await this._ensureUserProfile(userID, req);
  }

  async _assignRoomOwner(room, req) {
    if (!room?.ID) return;

    const userID = (req.user && req.user.id && req.user.id !== 'anonymous') ? req.user.id : 'sami';
    const db = cds.db;

    await db.run(INSERT.into('aymax.knowledgehub.RoomMembers').entries({
      ID: cds.utils.uuid(),
      room_ID: room.ID,
      userID,
      role: 'owner',
      joinedAt: new Date().toISOString()
    }));
  }

  async _checkRoomManager(req) {
    const isManager = _hasRole(req, 'Manager', 'Administrator');
    if (!isManager) return req.reject(403, 'Seuls les Managers peuvent modifier les Rooms');
  }

  async _enrichRooms(rooms, req) {
    if (!req.user || !Array.isArray(rooms) || rooms.length === 0) return;
    const userID  = (req.user && req.user.id && req.user.id !== 'anonymous') ? req.user.id : 'sami';
    const roomIDs = rooms.map(r => r.ID).filter(Boolean);
    const db = cds.db;

    const memberships = await db.run(
      SELECT.from('aymax.knowledgehub.RoomMembers')
        .where({ room_ID: { in: roomIDs }, userID })
    );
    const joinedSet = new Set(memberships.map(m => m.room_ID));

    for (const room of rooms) {
      room.isJoined = joinedSet.has(room.ID);
    }
  }

  // ============================================================
  // ACTIONS MEMBRES
  // ============================================================
  async _joinRoom(req) {
    const { roomID } = req.data;
    const userID = (req.user && req.user.id && req.user.id !== 'anonymous') ? req.user.id : 'sami';
    const db = cds.db;
    await this._ensureUserProfile(userID, req);

    const existing = await this._isMemberOfRoom(roomID, userID);
    if (existing) return false;

    await db.run(INSERT.into('aymax.knowledgehub.RoomMembers').entries({
      ID: cds.utils.uuid(), room_ID: roomID, userID, role: 'member',
      joinedAt: new Date().toISOString()
    }));
    await UPDATE(this.entities.Rooms).set('memberCount +=', 1).where({ ID: roomID });
    return true;
  }

  async _leaveRoom(req) {
    const { roomID } = req.data;
    const userID = (req.user && req.user.id && req.user.id !== 'anonymous') ? req.user.id : 'sami';
    const db = cds.db;

    const member = await this._isMemberOfRoom(roomID, userID);
    if (!member) return false;
    if (member.role === 'owner') return req.reject(400, 'Le propriétaire ne peut pas quitter la room');

    await db.run(DELETE.from('aymax.knowledgehub.RoomMembers').where({ ID: member.ID }));
    await UPDATE(this.entities.Rooms).set('memberCount -=', 1).where({ ID: roomID });
    return true;
  }

  async _inviteMember(req) {
    const { roomID, userID: invitedUserID } = req.data;
    const db = cds.db;

    const _curUser = (req.user && req.user.id && req.user.id !== 'anonymous') ? req.user.id : 'sami';
    if (!await this._isRoomAdmin(roomID, _curUser)) {
      return req.reject(403, 'Seuls les admins de la room peuvent inviter des membres');
    }
    const existing = await this._isMemberOfRoom(roomID, invitedUserID);
    if (existing) return false;

    await db.run(INSERT.into('aymax.knowledgehub.RoomMembers').entries({
      ID: cds.utils.uuid(), room_ID: roomID, userID: invitedUserID,
      role: 'member', joinedAt: new Date().toISOString()
    }));
    await UPDATE(this.entities.Rooms).set('memberCount +=', 1).where({ ID: roomID });
    return true;
  }

  async _removeMember(req) {
    const { roomID, memberID } = req.data;
    const db = cds.db;

    const _curUser2 = (req.user && req.user.id && req.user.id !== 'anonymous') ? req.user.id : 'sami';
    if (!await this._isRoomAdmin(roomID, _curUser2)) {
      return req.reject(403, 'Seuls les admins peuvent retirer des membres');
    }
    const member = await db.run(SELECT.one.from('aymax.knowledgehub.RoomMembers').where({ ID: memberID }));
    if (!member || member.role === 'owner') return req.reject(400, 'Impossible de retirer le propriétaire');

    await db.run(DELETE.from('aymax.knowledgehub.RoomMembers').where({ ID: memberID }));
    await UPDATE(this.entities.Rooms).set('memberCount -=', 1).where({ ID: roomID });
    return true;
  }

  async _updateMemberRole(req) {
    const { memberID, role } = req.data;
    const db = cds.db;

    const member = await db.run(SELECT.one.from('aymax.knowledgehub.RoomMembers').where({ ID: memberID }));
    if (!member) return req.reject(404, 'Membre introuvable');
    const _curUser3 = (req.user && req.user.id && req.user.id !== 'anonymous') ? req.user.id : 'sami';
    if (!await this._isRoomAdmin(member.room_ID, _curUser3)) {
      return req.reject(403, 'Seuls les admins peuvent modifier les rôles');
    }
    if (member.role === 'owner') return req.reject(400, 'Impossible de modifier le rôle du propriétaire');

    await db.run(UPDATE('aymax.knowledgehub.RoomMembers').set({ role }).where({ ID: memberID }));
    return true;
  }

  // ============================================================
  // ACTIONS STAGES
  // ============================================================
  async _changePostStage(req) {
    const { postID, stageID, comment } = req.data;
    const db = cds.db;

    const post = await db.run(SELECT.one.from('aymax.knowledgehub.Posts').where({ ID: postID }));
    if (!post) return req.reject(404, 'Post introuvable');

    const oldStageID = post.stage_ID;

    // Enregistrer l'historique
    await db.run(INSERT.into('aymax.knowledgehub.PostStageHistory').entries({
      ID:          cds.utils.uuid(),
      post_ID:     postID,
      fromStage_ID: oldStageID || null,
      toStage_ID:  stageID,
      changedBy:   (req.user && req.user.id && req.user.id !== 'anonymous') ? req.user.id : 'sami',
      changedAt:   new Date().toISOString(),
      comment:     comment || ''
    }));

    // Mettre a jour le post
    await db.run(UPDATE('aymax.knowledgehub.Posts').set({ stage_ID: stageID }).where({ ID: postID }));
    return true;
  }

  async _createStage(req) {
    const { roomID, name, color, icon, order, isDefault } = req.data;
    const _curUser4 = (req.user && req.user.id && req.user.id !== 'anonymous') ? req.user.id : 'sami';
    if (!await this._isRoomAdmin(roomID, _curUser4)) {
      return req.reject(403, 'Seuls les admins de la room peuvent créer des stages');
    }
    const stageID = cds.utils.uuid();
    await INSERT.into(this.entities.RoomStages).entries({
      ID: stageID, room_ID: roomID, name, color: color || '#1E3A8A',
      icon: icon || 'sap-icon://workflow-tasks', order: order || 0,
      isDefault: isDefault || false
    });
    return SELECT.one.from(this.entities.RoomStages).where({ ID: stageID });
  }

  async _updateStage(req) {
    const { stageID, name, color, icon, order } = req.data;
    const stage = await SELECT.one.from(this.entities.RoomStages).where({ ID: stageID });
    if (!stage) return req.reject(404, 'Stage introuvable');
    const _curUser5 = (req.user && req.user.id && req.user.id !== 'anonymous') ? req.user.id : 'sami';
    if (!await this._isRoomAdmin(stage.room_ID, _curUser5)) {
      return req.reject(403, 'Seuls les admins peuvent modifier les stages');
    }
    await UPDATE(this.entities.RoomStages).set({ name, color, icon, order }).where({ ID: stageID });
    return true;
  }

  async _deleteStage(req) {
    const { stageID } = req.data;
    const stage = await SELECT.one.from(this.entities.RoomStages).where({ ID: stageID });
    if (!stage) return req.reject(404, 'Stage introuvable');
    const _curUser6 = (req.user && req.user.id && req.user.id !== 'anonymous') ? req.user.id : 'sami';
    if (!await this._isRoomAdmin(stage.room_ID, _curUser6)) {
      return req.reject(403, 'Seuls les admins peuvent supprimer des stages');
    }
    // Remettre les posts de ce stage sans stage
    const db = cds.db;
    await db.run(UPDATE('aymax.knowledgehub.Posts').set({ stage_ID: null }).where({ stage_ID: stageID }));
    await DELETE.from(this.entities.RoomStages).where({ ID: stageID });
    return true;
  }

  // ============================================================
  // FONCTIONS
  // ============================================================
  async _getRoomStats(req) {
    const { roomID } = req.data;
    const db = cds.db;

    const [memberCount, postCount, questionCount, stageCount] = await Promise.all([
      db.run(SELECT.from('aymax.knowledgehub.RoomMembers').columns('count(*) as count').where({ room_ID: roomID })),
      db.run(SELECT.from('aymax.knowledgehub.Posts').columns('count(*) as count').where({ room_ID: roomID })),
      db.run(SELECT.from('aymax.knowledgehub.Questions').columns('count(*) as count').where({ room_ID: roomID })),
      db.run(SELECT.from('aymax.knowledgehub.RoomStages').columns('count(*) as count').where({ room_ID: roomID }))
    ]);

    return {
      memberCount:   memberCount?.[0]?.count   || 0,
      postCount:     postCount?.[0]?.count     || 0,
      questionCount: questionCount?.[0]?.count || 0,
      stageCount:    stageCount?.[0]?.count    || 0
    };
  }

  async _getMyRooms(req) {
    const db = cds.db;
    const memberships = await db.run(
      SELECT.from('aymax.knowledgehub.RoomMembers')
        .columns('room_ID')
        .where({ userID: (req.user && req.user.id && req.user.id !== 'anonymous') ? req.user.id : 'sami' })
    );
    const roomIDs = memberships.map(m => m.room_ID);
    if (roomIDs.length === 0) return [];

    return SELECT.from(this.entities.Rooms).where({ ID: { in: roomIDs } });
  }

  async _getStageHistory(req) {
    const { postID } = req.data;
    const db = cds.db;
    return db.run(
      SELECT.from('aymax.knowledgehub.PostStageHistory')
        .where({ post_ID: postID })
        .orderBy({ changedAt: 'desc' })
    );
  }
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
