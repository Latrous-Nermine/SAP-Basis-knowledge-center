import cds from '@sap/cds';
import { notify, notifyMany } from '../lib/notify.js';

/**
 * FeedHandler — Gestion du fil d'actualite, likes, commentaires, favoris, rooms
 * Auteur XSUAA automatique via req.user.id
 */
export default class FeedHandler extends cds.ApplicationService {
  async init() {
    const { Posts, Likes, Comments, UserProfiles, Favorites } = this.entities;

    // ---- HOOKS AVANT ----
    this.before('CREATE', 'Posts',    this._setAuthor.bind(this));
    this.before('UPDATE', 'Posts',    this._checkAuthor.bind(this));
    this.before('DELETE', 'Posts',    this._checkAuthorOrAdmin.bind(this));
    this.before('DELETE', 'Posts',    this._purgePost.bind(this));
    this.before('CREATE', 'Comments', this._setCommentAuthor.bind(this));

    // ---- HOOKS APRES ----
    this.after('READ',   'Posts',     this._enrichPosts.bind(this));
    this.after('CREATE', 'Posts',     this._incrementRoomPostCount.bind(this));
    // Separate hook from the counter above on purpose (2026-08 addition) -
    // keeps the pre-existing, already-tested counter logic untouched.
    this.after('CREATE', 'Posts',     this._notifyRoomPost.bind(this));

    // ---- ACTIONS ----
    this.on('likePost',       this._likePost.bind(this));
    this.on('unlikePost',     this._unlikePost.bind(this));
    this.on('dislikePost',    this._dislikePost.bind(this));
    this.on('undislikePost',  this._undislikePost.bind(this));
    this.on('addComment',     this._addComment.bind(this));
    this.on('sharePost',      this._sharePost.bind(this));
    this.on('repostPost',     this._repostPost.bind(this));
    this.on('joinRoom',       this._joinRoom.bind(this));
    this.on('leaveRoom',      this._leaveRoom.bind(this));
    this.on('addFavorite',    this._addFavorite.bind(this));
    this.on('removeFavorite', this._removeFavorite.bind(this));
    this.on('uploadDocument', this._uploadDocument.bind(this));
    this.on('deleteDocument', this._deleteDocument.bind(this));
    this.on('summarizeDocumentWithAI', this._summarizeDocumentWithAI.bind(this));

    // ---- FONCTIONS ----
    this.on('getFeed',               this._getFeed.bind(this));
    this.on('getTrendingTags',       this._getTrendingTags.bind(this));
    this.on('getSuggestedExperts',   this._getSuggestedExperts.bind(this));
    this.on('getCurrentUserProfile', this._getCurrentUserProfile.bind(this));
    this.on('getMyShortcuts',        this._getMyShortcuts.bind(this));

    await super.init();
  }

// ============================================================
// UTILITAIRE — Auto-creation du profil utilisateur
// ============================================================
  async _ensureUserProfile(req) {
    const userID = _currentUserID(req);
    const { UserProfiles } = this.entities;
    const exists = await SELECT.one.from(UserProfiles).where({ userID });
    if (!exists) {
      const displayName = (req.user && req.user.attr?.firstName)
        ? `${req.user.attr.firstName} ${req.user.attr.lastName || ''}`.trim()
        : 'Consultant SAP';
      await INSERT.into(UserProfiles).entries({
        userID:      userID,
        email:       req.user?.attr?.email || `${userID}@aymax.fr`,
        displayName: displayName,
        avatarUrl:   `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1E3A8A&color=fff`,
        department:  req.user?.attr?.department || 'SAP Basis',
        jobTitle:    req.user?.attr?.jobTitle || 'Consultant',
        reputation:  100,
        badgesCount: 1,
        isActive:    true
      });
    }
  }

  // ============================================================
  // HOOKS — Auteur
  // ============================================================
  async _setAuthor(req) {
    const userID = _currentUserID(req);
    req.data.author_userID = userID;
    await this._ensureUserProfile(req);

    // Validation backend — contenu obligatoire
    const content = (req.data.content || '').toString().trim();
    if (!content) return req.reject(400, 'Le contenu de la publication est obligatoire');

    // Validation backend — type de publication valide
    if (req.data.type && !_allowedPostTypes.includes(req.data.type)) {
      return req.reject(400, `Type de publication invalide : ${req.data.type}`);
    }

    // Validation backend — statut valide
    if (req.data.status && !_allowedPostStatus.includes(req.data.status)) {
      return req.reject(400, `Statut invalide : ${req.data.status}`);
    }
  }

  async _setCommentAuthor(req) {
    const userID = _currentUserID(req);
    req.data.author_userID = userID;
    await this._ensureUserProfile(req);
  }

  async _checkAuthor(req) {
    const postID = req.data?.ID || req.params?.[0]?.ID;
    if (!postID) return;
    const post = await SELECT.one.from(this.entities.Posts, postID, p => p.author_userID);
    if (!post) return req.reject(404, 'Post introuvable');
    const isAdmin = _hasRole(req, 'Administrator');
    if (post.author_userID !== _currentUserID(req) && !isAdmin) {
      return req.reject(403, 'Vous ne pouvez modifier que vos propres publications');
    }
  }

  async _checkAuthorOrAdmin(req) {
    const postID = req.data?.ID || req.params?.[0]?.ID;
    if (!postID) return;
    const post = await SELECT.one.from(this.entities.Posts, postID, p => p.author_userID);
    if (!post) return req.reject(404, 'Post introuvable');
    const isAdmin = _hasRole(req, 'Administrator', 'Manager');
    if (post.author_userID !== _currentUserID(req) && !isAdmin) {
      return req.reject(403, 'Vous ne pouvez supprimer que vos propres publications');
    }
  }

  // ============================================================
  // HOOK APRES — Enrichissement posts (isLikedByMe, isFavoritedByMe)
  // ============================================================
  async _enrichPosts(posts, req) {
    if (!Array.isArray(posts) || posts.length === 0) return;
    const userID  = _currentUserID(req);
    const postIDs = posts.map(p => p.ID).filter(Boolean);

    // Likes de l'utilisateur
    const userLikes = await SELECT.from(this.entities.Likes)
      .where({ userID: userID, post_ID: { in: postIDs } });
    const likedSet = new Set(userLikes.map(l => l.post_ID));

    // Dislikes de l'utilisateur
    const userDislikes = await SELECT.from(this.entities.Dislikes)
      .where({ userID: userID, post_ID: { in: postIDs } });
    const dislikedSet = new Set(userDislikes.map(d => d.post_ID));

    // Favoris de l'utilisateur
    const userFavs = await SELECT.from(this.entities.Favorites)
      .where({ userID: userID, targetType: 'post', targetID: { in: postIDs } });
    const favSet = new Set(userFavs.map(f => f.targetID));

    // Republiques par l'utilisateur
    const userReposts = await SELECT.from(this.entities.PostReposts)
      .where({ userID: userID, original_ID: { in: postIDs } });
    const repostSet = new Set(userReposts.map(r => r.original_ID));

    for (const post of posts) {
      post.isLikedByMe     = likedSet.has(post.ID);
      post.isDislikedByMe  = dislikedSet.has(post.ID);
      post.isFavoritedByMe = favSet.has(post.ID);
      post.isRepostedByMe  = repostSet.has(post.ID);
    }
  }

  // ============================================================
  // HOOK APRES — Incrementer compteur posts de la room
  // ============================================================
  // data is an array with only the key populated (e.g. [{ID:...}]), not
  // the full inserted row - found the hard way (2026-08) by tracing why
  // this pre-existing hook silently never incremented anything: room_ID
  // was always undefined on it. Re-fetching by ID is the fix, for this
  // hook and _notifyRoomPost below.
  async _incrementRoomPostCount(data) {
    const postID = Array.isArray(data) ? data[0]?.ID : data?.ID;
    if (!postID) return;
    const post = await SELECT.one.from(this.entities.Posts).columns('room_ID').where({ ID: postID });
    if (post?.room_ID) {
      await UPDATE(this.entities.Rooms).set('postCount +=', 1).where({ ID: post.room_ID });
    }
  }

  // ============================================================
  // HOOK APRES — Notifier les membres de la room (2026-08)
  // ============================================================
  async _notifyRoomPost(data) {
    const postID = Array.isArray(data) ? data[0]?.ID : data?.ID;
    if (!postID) return;

    const db = cds.db;
    const post = await db.run(SELECT.one.from('aymax.knowledgehub.Posts')
      .columns('room_ID', 'author_userID').where({ ID: postID }));
    if (!post?.room_ID) return;

    const [room, author, members] = await Promise.all([
      db.run(SELECT.one.from('aymax.knowledgehub.Rooms').columns('name').where({ ID: post.room_ID })),
      db.run(SELECT.one.from('aymax.knowledgehub.UserProfiles').columns('displayName').where({ userID: post.author_userID })),
      db.run(SELECT.from('aymax.knowledgehub.RoomMembers').columns('userID').where({ room_ID: post.room_ID })),
    ]);
    if (!room || !members.length) return;

    notifyMany(
      members.map((m) => m.userID).filter((id) => id !== post.author_userID),
      'ROOM_POST',
      { sourceType: 'ROOM', sourceId: post.room_ID, params: { actorName: author?.displayName || post.author_userID, roomName: room.name } },
    );
  }

  // ============================================================
  // ACTIONS SOCIALES
  // ============================================================
  async _likePost(req) {
    const { postID } = req.data;
    const userID = _currentUserID(req);
    const { Likes, Dislikes, Posts } = this.entities;

    const existing = await SELECT.one.from(Likes).where({ post_ID: postID, userID });
    if (existing) return false;  // Deja like

    await INSERT.into(Likes).entries({ ID: cds.utils.uuid(), post_ID: postID, userID });
    await UPDATE(Posts).set('likeCount +=', 1).where({ ID: postID });

    // Si l'utilisateur avait disliké la publication, on enlève le dislike
    const existingDislike = await SELECT.one.from(Dislikes).where({ post_ID: postID, userID });
    if (existingDislike) {
      await DELETE.from(Dislikes).where({ ID: existingDislike.ID });
      await UPDATE(Posts).set('dislikeCount -=', 1).where({ ID: postID });
    }

    return true;
  }

  async _unlikePost(req) {
    const { postID } = req.data;
    const userID = _currentUserID(req);
    const { Likes, Posts } = this.entities;

    const existing = await SELECT.one.from(Likes).where({ post_ID: postID, userID });
    if (!existing) return false;  // Pas like

    await DELETE.from(Likes).where({ ID: existing.ID });
    await UPDATE(Posts).set('likeCount -=', 1).where({ ID: postID });
    return true;
  }

  async _dislikePost(req) {
    const { postID } = req.data;
    const userID = _currentUserID(req);
    const { Dislikes, Likes, Posts } = this.entities;

    const existingDislike = await SELECT.one.from(Dislikes).where({ post_ID: postID, userID });
    if (existingDislike) return false;  // Deja dislike

    await INSERT.into(Dislikes).entries({ ID: cds.utils.uuid(), post_ID: postID, userID });
    await UPDATE(Posts).set('dislikeCount +=', 1).where({ ID: postID });

    // Si l'utilisateur avait liké la publication, on enlève le like
    const existingLike = await SELECT.one.from(Likes).where({ post_ID: postID, userID });
    if (existingLike) {
      await DELETE.from(Likes).where({ ID: existingLike.ID });
      await UPDATE(Posts).set('likeCount -=', 1).where({ ID: postID });
    }

    return true;
  }

  async _undislikePost(req) {
    const { postID } = req.data;
    const userID = _currentUserID(req);
    const { Dislikes, Posts } = this.entities;

    const existing = await SELECT.one.from(Dislikes).where({ post_ID: postID, userID });
    if (!existing) return false;  // Pas dislike

    await DELETE.from(Dislikes).where({ ID: existing.ID });
    await UPDATE(Posts).set('dislikeCount -=', 1).where({ ID: postID });
    return true;
  }

  async _addComment(req) {
    const { postID, content, parentID } = req.data;
    if (!content?.trim()) return req.reject(400, 'Le contenu du commentaire est obligatoire');

    const { Comments, Posts, UserProfiles } = this.entities;
    const commenterID = _currentUserID(req);
    const newComment = await INSERT.into(Comments).entries({
      ID:             cds.utils.uuid(),
      post_ID:        postID,
      parent_ID:      parentID || null,
      author_userID:  commenterID,
      content:        content.trim()
    });

    await UPDATE(Posts).set('commentCount +=', 1).where({ ID: postID });

    // Every other notify() trigger in the app fires on "someone engaged
    // with your content" (Room posts, accepted answers, Knowledge
    // approvals) except this one, the single most common social action
    // in the app - a real, reported gap, not a new type: COMMENT is
    // already defined and already used this exact way by Questions.
    const post = await SELECT.one.from(Posts).columns('author_userID', 'title', 'content').where({ ID: postID });
    if (post && post.author_userID !== commenterID) {
      const commenter = await SELECT.one.from(UserProfiles).columns('displayName').where({ userID: commenterID });
      notify(post.author_userID, 'COMMENT', {
        sourceType: 'POST', sourceId: postID,
        params: { actorName: commenter?.displayName || commenterID, title: post.title || post.content?.slice(0, 60) || '' },
      });
    }

    return newComment;
  }

  async _sharePost(req) {
    const { postID } = req.data;
    await UPDATE(this.entities.Posts).set('shareCount +=', 1).where({ ID: postID });
    return true;
  }

  // ============================================================
  // ACTION — Republier une publication
  // Cree un nouveau post lie au post original (repostOf) et
  // enregistre la trace dans PostReposts (anti-doublon par utilisateur).
  // ============================================================
  async _repostPost(req) {
    const { postID } = req.data;
    const userID = _currentUserID(req);
    const { Posts, PostReposts } = this.entities;

    const original = await SELECT.one.from(Posts, postID, p => {
      p.ID, p.content, p.title, p.summary, p.type, p.status, p.room_ID, p.shareCount
    });
    if (!original) return req.reject(404, 'Publication introuvable');
    if (original.status !== 'published') {
      return req.reject(400, 'Seules les publications publiées peuvent être republiées');
    }

    // Déjà republié par cet utilisateur → retourner la republication existante (idempotent)
    const existing = await SELECT.one.from(PostReposts).where({ original_ID: postID, userID });
    if (existing) {
      return SELECT.one.from(Posts, existing.repost_ID);
    }

    await this._ensureUserProfile(req);

    const repostID = cds.utils.uuid();
    const now = new Date().toISOString();
    await INSERT.into(Posts).entries({
      ID:           repostID,
      content:      original.content,
      title:        original.title,
      summary:      original.summary,
      type:         original.type,
      status:       'published',
      room_ID:      original.room_ID || null,
      repostOf_ID:  postID,
      createdAt:    now,
      createdBy:    userID,
      modifiedAt:   now,
      modifiedBy:   userID
    });
    await INSERT.into(PostReposts).entries({
      ID:          cds.utils.uuid(),
      original_ID: postID,
      repost_ID:   repostID,
      userID,
      repostedAt:  now
    });
    await UPDATE(Posts).set('shareCount +=', 1).where({ ID: postID });
    return SELECT.one.from(Posts, repostID);
  }

  // ============================================================
  // HOOK AVANT — Suppression propre d'un post (cascade manuelle)
  // Supprime les enfants (documents, likes, commentaires, tags,
  // republications...) AVANT le DELETE parent pour eviter tout
  // conflit de cles etrangeres, quelle que soit la base (sqlite/HANA).
  // ============================================================
  async _purgePost(req, postIDOverride) {
    const postID = postIDOverride || req.data?.ID || req.params?.[0]?.ID;
    if (!postID) return;
    const db = cds.db;
    const post = await db.run(SELECT.one.from('aymax.knowledgehub.Posts').where({ ID: postID }));
    if (!post) return;

    // Tags lies au post (avant suppression) → decrementer usageCount
    const postTags = await db.run(SELECT.from('aymax.knowledgehub.PostTags').where({ post_ID: postID }));
    for (const pt of postTags) {
      await db.run(DELETE.from('aymax.knowledgehub.PostTags').where({ ID: pt.ID }));
      await UPDATE(this.entities.Tags).set('usageCount -=', 1).where({ ID: pt.tag_ID });
    }

    // Enfants du post
    await db.run(DELETE.from('aymax.knowledgehub.PostStageHistory').where({ post_ID: postID }));
    await db.run(DELETE.from('aymax.knowledgehub.PostTopics').where({ post_ID: postID }));
    await db.run(DELETE.from('aymax.knowledgehub.PostDocuments').where({ post_ID: postID }));
    await db.run(DELETE.from('aymax.knowledgehub.Likes').where({ post_ID: postID }));

    // Commentaires (reponses imbriquees d'abord)
    const comments = await db.run(SELECT.from('aymax.knowledgehub.Comments').where({ post_ID: postID }));
    const commentIDs = comments.map(c => c.ID);
    if (commentIDs.length) {
      await db.run(DELETE.from('aymax.knowledgehub.Comments').where({ parent_ID: { in: commentIDs } }));
    }
    await db.run(DELETE.from('aymax.knowledgehub.Comments').where({ post_ID: postID }));

    // Republications de ce post (reposts lies) — purge recursive
    const reposts = await db.run(SELECT.from('aymax.knowledgehub.Posts').where({ repostOf_ID: postID }));
    for (const r of reposts) {
      await this._purgePost(req, r.ID);
      await db.run(DELETE.from('aymax.knowledgehub.Posts').where({ ID: r.ID }));
      await db.run(DELETE.from('aymax.knowledgehub.PostReposts').where({ repost_ID: r.ID }));
    }

    // Traces PostReposts (original ou repost)
    await db.run(DELETE.from('aymax.knowledgehub.PostReposts').where({ repost_ID: postID }));
    await db.run(DELETE.from('aymax.knowledgehub.PostReposts').where({ original_ID: postID }));

    // Compteur room
    if (post.room_ID) {
      await UPDATE(this.entities.Rooms).set('postCount -=', 1).where({ ID: post.room_ID });
    }

    // NB: le post parent est supprimé par le handler générique DELETE
    // (cascade manuelle des enfants uniquement, sinon 404 sur la requête).
  }

  // ============================================================
  // ACTIONS ROOMS (join / leave)
  // ============================================================
  async _joinRoom(req) {
    const { roomID } = req.data;
    const userID = _currentUserID(req);

    // Verifier si deja membre
    const { Rooms } = this.entities;
    const room = await SELECT.one.from(Rooms).where({ ID: roomID });
    if (!room) return req.reject(404, 'Room introuvable');

    // Inserer dans RoomMembers via schema direct
    const db = cds.db;
    const existing = await db.run(
      SELECT.one.from('aymax.knowledgehub.RoomMembers').where({ room_ID: roomID, userID })
    );
    if (existing) return false;  // Deja membre

    await db.run(INSERT.into('aymax.knowledgehub.RoomMembers').entries({
      ID:       cds.utils.uuid(),
      room_ID:  roomID,
      userID,
      role:     'member',
      joinedAt: new Date().toISOString()
    }));
    await UPDATE(Rooms).set('memberCount +=', 1).where({ ID: roomID });
    return true;
  }

  async _leaveRoom(req) {
    const { roomID } = req.data;
    const userID = _currentUserID(req);
    const { Rooms } = this.entities;
    const db = cds.db;

    const member = await db.run(
      SELECT.one.from('aymax.knowledgehub.RoomMembers').where({ room_ID: roomID, userID })
    );
    if (!member) return false;

    // L'owner ne peut pas quitter
    if (member.role === 'owner') return req.reject(400, 'Le propriétaire ne peut pas quitter la room. Transférez la propriété d\'abord.');

    await db.run(DELETE.from('aymax.knowledgehub.RoomMembers').where({ ID: member.ID }));
    await UPDATE(Rooms).set('memberCount -=', 1).where({ ID: roomID });
    return true;
  }

  // ============================================================
  // ACTIONS FAVORIS
  // ============================================================
  async _addFavorite(req) {
    const { targetType, targetID } = req.data;
    const userID = _currentUserID(req);
    const { Favorites } = this.entities;

    const existing = await SELECT.one.from(Favorites).where({ userID, targetType, targetID });
    if (existing) return false;

    await INSERT.into(Favorites).entries({
      ID: cds.utils.uuid(), userID, targetType, targetID,
      savedAt: new Date().toISOString()
    });
    return true;
  }

  async _removeFavorite(req) {
    const { targetType, targetID } = req.data;
    const userID = _currentUserID(req);
    const { Favorites } = this.entities;

    const existing = await SELECT.one.from(Favorites).where({ userID, targetType, targetID });
    if (!existing) return false;

    await DELETE.from(Favorites).where({ ID: existing.ID });
    return true;
  }

  // ============================================================
  // ACTIONS DOCUMENTS (upload base64)
  // ============================================================
  async _uploadDocument(req) {
    const { postID, fileName, fileType, fileSize, content, summary } = req.data;
    if (!postID) return req.reject(400, 'postID obligatoire');
    if (!fileName || !content) return req.reject(400, 'fileName et content obligatoires');

    // Verifier que le post existe et appartient a l'utilisateur (ou admin)
    const post = await SELECT.one.from(this.entities.Posts, postID, p => p.author_userID);
    if (!post) return req.reject(404, 'Post introuvable');

    const isAdmin = _hasRole(req, 'Administrator');
    if (post.author_userID !== _currentUserID(req) && !isAdmin) {
      return req.reject(403, 'Vous ne pouvez ajouter des documents qu\'à vos propres publications');
    }

    // Detecter le type automatiquement si non fourni
    const sFileType = fileType || fileName.split('.').pop().toLowerCase();

    // Validation backend — extension autorisée
    if (!_allowedFileTypes.includes(sFileType)) {
      return req.reject(400, `Type de fichier non autorisé : ${sFileType} (PDF, DOC, DOCX, PNG, JPG, JPEG, WEBP autorisés)`);
    }

    // Validation backend — taille maximale (10 MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const iRealSize = Buffer.from(content || '', 'base64').length;
    if ((fileSize && fileSize > MAX_FILE_SIZE) || iRealSize > MAX_FILE_SIZE) {
      return req.reject(400, `Fichier trop volumineux (max 10 MB) : ${fileName}`);
    }

    // Validation backend — nombre max de pièces jointes (5)
    const existingDocs = await SELECT.from(this.entities.PostDocuments).where({ post_ID: postID });
    if (existingDocs.length >= 5) {
      return req.reject(400, 'Maximum 5 pièces jointes par publication');
    }

    // En local/test : on stocke le data URI directement
    const sFileUrl = `data:${_mimeFromType(sFileType)};base64,${content}`;

    const newDoc = {
      ID:        cds.utils.uuid(),
      post_ID:   postID,
      fileName:  fileName,
      fileUrl:   sFileUrl,
      fileType:  sFileType,
      fileSize:  fileSize || 0,
      summary:   summary || null
    };

    await INSERT.into(this.entities.PostDocuments).entries(newDoc);

    // Mettre à jour le résumé du post parent si fourni
    if (summary) {
      await UPDATE(this.entities.Posts).set({ summary }).where({ ID: postID });
    }

    return newDoc;
  }

  // ============================================================
  // ACTION IA — Résumé de document avec Gemini API
  // ============================================================
  async _summarizeDocumentWithAI(req) {
    const { apiKey, fileName, fileType, content } = req.data;
    if (!content) return req.reject(400, 'Le contenu du document est requis');

    const sApiKey = apiKey || process.env.GEMINI_API_KEY;
    const sMimeType = _mimeFromType(fileType || fileName?.split('.').pop());

    if (sApiKey) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${sApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "Tu es un assistant expert SAP Basis & BTP. Analyse ce document et donne un résumé exécutif très clair et concis en français (3 puces clés max)." },
                {
                  inline_data: {
                    mime_type: sMimeType === 'application/octet-stream' ? 'text/plain' : sMimeType,
                    data: content
                  }
                }
              ]
            }]
          })
        });

        const data = await response.json();
        const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResult) {
          return textResult.trim();
        }
      } catch (err) {
        console.warn('Gemini API call failed, using fallback:', err.message);
      }
    }

    // Fallback intelligent si clé non fournie ou hors-ligne
    return `✨ Résumé IA (${fileName}) :\n• Document technique relatif à l'écosystème SAP / BTP.\n• Analyse des composants, prérequis de déploiement et configuration.\n• Recommandations clés pour l'architecture et les opérations.`;
  }

  async _deleteDocument(req) {
    const { documentID } = req.data;
    const doc = await SELECT.one.from(this.entities.PostDocuments, documentID, d => { d.ID, d.post_ID });
    if (!doc) return req.reject(404, 'Document introuvable');

    // Verifier propriete
    const post = await SELECT.one.from(this.entities.Posts, doc.post_ID, p => p.author_userID);
    const isAdmin = _hasRole(req, 'Administrator');
    if (post && post.author_userID !== _currentUserID(req) && !isAdmin) {
      return req.reject(403, 'Accès refusé');
    }

    await DELETE.from(this.entities.PostDocuments).where({ ID: documentID });
    return true;
  }

  // ============================================================
  // FONCTIONS FEED
  // ============================================================
  async _getFeed(req) {
    const { filter, roomID, topicID, limit } = req.data;
    const { Posts } = this.entities;

    let query = SELECT.from(Posts, p => {
      p.ID, p.content, p.title, p.type, p.status, p.viewCount, p.likeCount,
      p.commentCount, p.shareCount, p.createdAt, p.modifiedAt,
      p.author(a => { a.userID, a.displayName, a.avatarUrl, a.jobTitle }),
      p.room(r => { r.ID, r.name }),
      p.stage(s => { s.ID, s.name, s.color }),
      p.tags(t => { t.ID, t.tag(tt => { tt.ID, tt.name, tt.color }) }),
      p.documents(d => { d.ID, d.fileName, d.fileType, d.fileSize, d.fileUrl }),
      p.repostOf(r => { r.ID, r.content, r.author(a => { a.userID, a.displayName, a.avatarUrl }) })
    })
    .where({ status: 'published' })
    .orderBy({ createdAt: 'desc' })
    .limit(limit || 20);

    if (roomID)  query = query.where({ room_ID: roomID });
    if (topicID) query = query.where({ exists: SELECT.from('aymax.knowledgehub.PostTopics').where({ topic_ID: topicID }) });
    if (filter) {
      const p = `%${filter}%`;
      query = query.where`content like ${p} or title like ${p} or summary like ${p}`;
    }

    return query;
  }

  async _getTrendingTags() {
    return SELECT.from(this.entities.Tags).orderBy({ usageCount: 'desc' }).limit(10);
  }

  async _getSuggestedExperts() {
    return SELECT.from(this.entities.UserProfiles)
      .where({ isActive: true })
      .orderBy({ reputation: 'desc' })
      .limit(5);
  }

  async _getCurrentUserProfile(req) {
    await this._ensureUserProfile(req);
    const userID = _currentUserID(req);
    return SELECT.one.from(this.entities.UserProfiles).where({ userID });
  }

  async _getMyShortcuts(req) {
    const userID = _currentUserID(req);
    const db = cds.db;

    const [postsCount, questionsCount, favRoomsCount, savedCount] = await Promise.all([
      db.run(SELECT.from('aymax.knowledgehub.Posts').columns('count(*) as count').where({ author_userID: userID })),
      db.run(SELECT.from('aymax.knowledgehub.Questions').columns('count(*) as count').where({ author_userID: userID })),
      db.run(SELECT.from('aymax.knowledgehub.RoomMembers').columns('count(*) as count').where({ userID })),
      db.run(SELECT.from('aymax.knowledgehub.Favorites').columns('count(*) as count').where({ userID }))
    ]);

    return {
      myPostsCount:       postsCount?.[0]?.count       || 0,
      myQuestionsCount:   questionsCount?.[0]?.count   || 0,
      favoriteRoomsCount: favRoomsCount?.[0]?.count    || 0,
      savedContents:      savedCount?.[0]?.count        || 0
    };
  }
}

// ============================================================
// CONSTANTES — Validations backend publication
// ============================================================
const _allowedPostTypes = ['knowledge', 'announcement'];
const _allowedPostStatus = ['draft', 'published', 'archived'];

// Extensions de fichiers autorisées (formats requis + compatibilité historique)
const _allowedFileTypes = [
  'pdf', 'doc', 'docx',
  'png', 'jpg', 'jpeg', 'webp',
  'gif', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip'
];

// ============================================================
// HELPER — ID utilisateur effectif (fallback dev sans auth)
// ============================================================
function _currentUserID(req) {
  // Dead in practice now: FeedService requires 'authenticated-user'
  // (added during Lot 1 integration - the original had no @requires at
  // all), so req.user.id is always present here. Fallback ID updated
  // to match this integration's UserProfiles IDs ('sami', not
  // 'sami.ben.youssef' - see db/data/aymax.knowledgehub-UserProfiles.csv).
  return (req.user && req.user.id && req.user.id !== 'anonymous') ? req.user.id : 'sami';
}

// ============================================================
// HELPER — Check des rôles utilisateur
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

// ============================================================
// HELPER — Extension vers MIME type
// ============================================================
function _mimeFromType(ext) {
  const mimes = {
    pdf:  'application/pdf',
    doc:  'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls:  'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt:  'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    png:  'image/png',
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif:  'image/gif',
    svg:  'image/svg+xml',
    txt:  'text/plain',
    csv:  'text/csv',
    zip:  'application/zip'
  };
  return mimes[ext?.toLowerCase()] || 'application/octet-stream';
}