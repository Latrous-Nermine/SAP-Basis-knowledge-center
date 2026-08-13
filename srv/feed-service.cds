using { aymax.knowledgehub as kh } from '../db/schema';

/** Nermine's original had no @requires/@restrict anywhere in this file -
    added here per CLAUDE.md §7 rule 1 ("every entity in every service
    carries @restrict, no exceptions"), same baseline gap found and
    closed on every other integrated branch this session (Riadh's Lot 3
    had the same gap). This is the minimum bar only - authenticated
    users, no anonymous access. Finer per-room/per-author write
    restrictions (e.g. only a room's owner can moderate it) are NOT
    added here - that's business logic only Nermine can confirm, not
    something to invent unilaterally; see TODO-INTEGRATION.md. */
@path: '/odata/v4/feed'
@requires: 'authenticated-user'
service FeedService {

  type ShortcutResult {
    myPostsCount       : Integer;
    myQuestionsCount   : Integer;
    favoriteRoomsCount : Integer;
    savedContents      : Integer;
  }

  entity Posts as projection on kh.Posts {
    *,
    false as isLikedByMe    : Boolean,
    false as isDislikedByMe : Boolean,
    false as isFavoritedByMe : Boolean,
    false as isRepostedByMe  : Boolean
  };

  entity UserProfiles  as projection on kh.UserProfiles;
  entity Tags          as projection on kh.Tags;
  entity Rooms         as projection on kh.Rooms;
  entity Comments      as projection on kh.Comments;
  entity Likes         as projection on kh.Likes;
  entity Dislikes      as projection on kh.Dislikes;
  entity PostDocuments as projection on kh.PostDocuments;
  entity PostTags      as projection on kh.PostTags;
  entity PostReposts   as projection on kh.PostReposts;
  entity Topics        as projection on kh.Topics;
  entity Favorites     as projection on kh.Favorites;

  // --- ACTIONS SOCIALES ---
  action likePost(postID : UUID)                                         returns Boolean;
  action unlikePost(postID : UUID)                                       returns Boolean;
  action dislikePost(postID : UUID)                                      returns Boolean;
  action undislikePost(postID : UUID)                                    returns Boolean;
  action addComment(postID : UUID, content : String, parentID : UUID)    returns Comments;
  action sharePost(postID : UUID)                                        returns Boolean;
  action repostPost(postID : UUID)                                       returns Posts;

  // --- ACTIONS DOCUMENTS ---
  action uploadDocument(
    postID   : UUID,
    fileName : String,
    fileType : String,
    fileSize : Integer,
    content  : LargeString,   // base64 encoded file content
    summary  : LargeString    // AI generated summary
  ) returns PostDocuments;

  action deleteDocument(documentID : UUID) returns Boolean;

  // --- ACTIONS IA / GEMINI ---
  action summarizeDocumentWithAI(
    apiKey   : String,
    fileName : String,
    fileType : String,
    content  : LargeString
  ) returns String;

  // --- ACTIONS ROOMS ---
  action joinRoom(roomID : UUID)                                         returns Boolean;
  action leaveRoom(roomID : UUID)                                        returns Boolean;

  // --- ACTIONS FAVORIS ---
  action addFavorite(targetType : String, targetID : UUID)               returns Boolean;
  action removeFavorite(targetType : String, targetID : UUID)            returns Boolean;

  // --- FONCTIONS FEED ---
  function getFeed(filter : String, roomID : UUID, topicID : UUID, limit : Integer) returns many Posts;
  function getTrendingTags()                                             returns many Tags;
  function getSuggestedExperts()                                         returns many UserProfiles;
  function getMyShortcuts(userID : String)                               returns ShortcutResult;
  function getCurrentUserProfile()                                       returns UserProfiles;
}