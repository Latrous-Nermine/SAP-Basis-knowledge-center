import cds from '@sap/cds';

export default class FeedHandler extends cds.ApplicationService {
  async init() {
    const { Posts, Likes, Comments, UserProfiles } = this.entities;

    // --- HOOKS ---
    this.before('CREATE', 'Posts', this._setAuthor.bind(this));
    this.before('CREATE', 'Comments', this._setCommentAuthor.bind(this));
    
    this.after('READ', 'Posts', this._enrichPosts.bind(this));
    
    // --- ACTIONS ---
    this.on('likePost', this._likePost.bind(this));
    this.on('unlikePost', this._unlikePost.bind(this));
    this.on('addComment', this._addComment.bind(this));
    this.on('sharePost', this._sharePost.bind(this));
    
    // --- FUNCTIONS ---
    this.on('getFeed', this._getFeed.bind(this));
    this.on('getTrendingTags', this._getTrendingTags.bind(this));
    this.on('getSuggestedExperts', this._getSuggestedExperts.bind(this));
    this.on('getCurrentUserProfile', this._getCurrentUserProfile.bind(this));

    await super.init();
  }

  // ============================================================
  // AUTH & AUTHOR
  // ============================================================
  async _setAuthor(req) {
    if (!req.user) return;
    req.data.author_userID = req.user.id;
    
    // Auto-création du profil si premier post
    const { UserProfiles } = this.entities;
    const exists = await SELECT.one.from(UserProfiles).where({ userID: req.user.id });
    if (!exists) {
      await INSERT.into(UserProfiles).entries({
        userID: req.user.id,
        email: req.user.attr?.email || req.user.id,
        displayName: `${req.user.attr?.firstName || ''} ${req.user.attr?.lastName || ''}`.trim() || 'Utilisateur',
        department: req.user.attr?.department || 'SAP',
        jobTitle: req.user.attr?.jobTitle || 'Consultant'
      });
    }
  }

  async _setCommentAuthor(req) {
    if (req.user) req.data.author_userID = req.user.id;
  }

  // ============================================================
  // ENRICHISSEMENT (isLikedByMe, etc.)
  // ============================================================
  async _enrichPosts(posts, req) {
    if (!req.user || !Array.isArray(posts)) return;
    const userID = req.user.id;
    const postIDs = posts.map(p => p.ID);
    
    const userLikes = await SELECT.from(this.entities.Likes)
      .where({ userID: userID, post_ID: { in: postIDs } });
    
    const likedSet = new Set(userLikes.map(l => l.post_ID));
    
    for (const post of posts) {
      post.isLikedByMe = likedSet.has(post.ID);
    }
  }

  // ============================================================
  // ACTIONS SOCIALES
  // ============================================================
  async _likePost(req) {
    const { postID } = req.data;
    const userID = req.user.id;
    const { Likes, Posts } = this.entities;

    const existing = await SELECT.one.from(Likes)
      .where({ post_ID: postID, userID: userID });

    if (existing) return false;

    await INSERT.into(Likes).entries({
      ID: cds.utils.uuid(),
      post_ID: postID,
      userID: userID
    });
    
    await UPDATE(Posts).set('likeCount +=', 1).where({ ID: postID });
    return true;
  }

  async _unlikePost(req) {
    const { postID } = req.data;
    const userID = req.user.id;
    const { Likes, Posts } = this.entities;

    const existing = await SELECT.one.from(Likes)
      .where({ post_ID: postID, userID: userID });

    if (!existing) return false;

    await DELETE.from(Likes).where({ ID: existing.ID });
    await UPDATE(Posts).set('likeCount -=', 1).where({ ID: postID });
    return true;
  }

  async _addComment(req) {
    const { postID, content, parentID } = req.data;
    const { Comments, Posts } = this.entities;

    const newComment = await INSERT.into(Comments).entries({
      ID: cds.utils.uuid(),
      post_ID: postID,
      parent_ID: parentID || null,
      author_userID: req.user.id,
      content: content
    });

    await UPDATE(Posts).set('commentCount +=', 1).where({ ID: postID });
    return newComment;
  }

  async _sharePost(req) {
    const { postID } = req.data;
    await UPDATE(this.entities.Posts).set('shareCount +=', 1).where({ ID: postID });
    return true;
  }

  // ============================================================
  // FEED & DÉCOUVERTE
  // ============================================================
  async _getFeed(req) {
    const { filter, roomID, limit } = req.data;
    const { Posts } = this.entities;
    
    let query = SELECT.from(Posts)
      .where({ status: 'published' })
      .orderBy({ createdAt: 'desc' })
      .limit(limit || 20);

    if (roomID) {
      query.where({ room_ID: roomID });
    }

    if (filter) {
      query.where({
        or: [
          { content: { like: `%${filter}%` } }
        ]
      });
    }

    return query;
  }

  async _getTrendingTags() {
    return SELECT.from(this.entities.Tags)
      .orderBy({ usageCount: 'desc' })
      .limit(10);
  }

  async _getSuggestedExperts() {
    return SELECT.from(this.entities.UserProfiles)
      .where({ isActive: true })
      .orderBy({ reputation: 'desc' })
      .limit(5);
  }

  async _getCurrentUserProfile(req) {
    return SELECT.one.from(this.entities.UserProfiles)
      .where({ userID: req.user.id });
  }
}