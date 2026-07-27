using { aymax.knowledgehub as kh } from '../db/schema';

@path: '/odata/v4/feed'
service FeedService {

  type ShortcutResult {
    myPostsCount       : Integer;
    myQuestionsCount   : Integer;
    favoriteRoomsCount : Integer;
    savedContents      : Integer;
  }

  @odata.draft.enabled
  entity Posts as projection on kh.Posts {
    *,
    false as isLikedByMe : Boolean
  };

  entity UserProfiles as projection on kh.UserProfiles;
  entity Tags         as projection on kh.Tags;
  entity Rooms        as projection on kh.Rooms;
  entity Comments     as projection on kh.Comments;
  entity Likes        as projection on kh.Likes;
  entity PostDocuments as projection on kh.PostDocuments;

  action likePost(postID : UUID)   returns Boolean;
  action unlikePost(postID : UUID) returns Boolean;
  action addComment(postID : UUID, content : String, parentID : UUID) returns Comments;
  action sharePost(postID : UUID) returns Boolean;

  function getFeed(filter : String, roomID : UUID, limit : Integer) returns many Posts;
  function getTrendingTags() returns many Tags;
  function getSuggestedExperts() returns many UserProfiles;
  function getMyShortcuts(userID : String) returns ShortcutResult;
  function getCurrentUserProfile() returns UserProfiles;
}