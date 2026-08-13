import cds from '@sap/cds'
import { randomUUID } from 'node:crypto'

// No auth flow wired into the prototype yet, so every request acts as this
// seeded employee - keeps like/comment/share and "my profile" consistent.
const CURRENT_USER_ID = 'b3494d32-704e-4bda-b3b7-50169e77705d'

export default class FeedService extends cds.ApplicationService {
  async init () {
    const { Posts, Comments, Likes, UserProfiles } = this.entities

    this.after('READ', Posts, async (results) => {
      const posts = Array.isArray(results) ? results : (results ? [results] : [])
      if (!posts.length) return

      const ids = posts.map(p => p.ID)
      const likeRows = await SELECT.from(Likes).where({ post_ID: ids })
      const commentRows = await SELECT.from(Comments).columns('post_ID').where({ post_ID: ids })

      const likeCounts = {}, myLikedPosts = new Set()
      for (const l of likeRows) {
        likeCounts[l.post_ID] = (likeCounts[l.post_ID] || 0) + 1
        if (l.author_ID === CURRENT_USER_ID) myLikedPosts.add(l.post_ID)
      }
      const commentCounts = {}
      for (const c of commentRows) commentCounts[c.post_ID] = (commentCounts[c.post_ID] || 0) + 1

      for (const p of posts) {
        p.likeCount = likeCounts[p.ID] || 0
        p.commentCount = commentCounts[p.ID] || 0
        p.isLikedByMe = myLikedPosts.has(p.ID)
      }
    })

    this.on('getCurrentUserProfile', async () => {
      const profile = await SELECT.one.from(UserProfiles).where({ employee_ID: CURRENT_USER_ID })
      return profile
    })

    this.on('likePost', async (req) => {
      const { postID } = req.data
      const existing = await SELECT.one.from(Likes).where({ post_ID: postID, author_ID: CURRENT_USER_ID })
      if (!existing) await INSERT.into(Likes).entries({ post_ID: postID, author_ID: CURRENT_USER_ID })
      return SELECT.one.from(Posts).where({ ID: postID })
    })

    this.on('unlikePost', async (req) => {
      const { postID } = req.data
      await DELETE.from(Likes).where({ post_ID: postID, author_ID: CURRENT_USER_ID })
      return SELECT.one.from(Posts).where({ ID: postID })
    })

    this.on('addComment', async (req) => {
      const { postID, content } = req.data
      if (!content || !content.trim()) return req.reject(400, 'Comment content must not be empty')
      const ID = randomUUID()
      await INSERT.into(Comments).entries({ ID, post_ID: postID, author_ID: CURRENT_USER_ID, content })
      return SELECT.one.from(Comments).where({ ID })
    })

    this.on('sharePost', async (req) => {
      const { postID } = req.data
      const post = await SELECT.one.from(Posts).where({ ID: postID })
      await UPDATE(Posts).set({ shareCount: (post.shareCount || 0) + 1 }).where({ ID: postID })
      return SELECT.one.from(Posts).where({ ID: postID })
    })

    return super.init()
  }
}
