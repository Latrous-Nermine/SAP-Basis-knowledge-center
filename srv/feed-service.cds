using { aymax.db as db } from '../db/schema';
using { aymax.knowledgehub as hub } from '../db/hub-schema';

service FeedService @(path: '/odata/v4/feed') {

  entity Posts as projection on hub.Posts {
    *,
    virtual likeCount    : Integer,
    virtual commentCount : Integer,
    virtual isLikedByMe  : Boolean
  };

  entity Comments      as projection on hub.Comments;
  entity Likes         as projection on hub.Likes;
  entity Tags          as projection on hub.Tags;
  entity Rooms         as projection on hub.Rooms;
  entity PostDocuments as projection on hub.PostDocuments;

  entity UserProfiles as projection on hub.UserProfiles {
    *,
    employee.name              as displayName : String,
    employee.level              as jobTitle : String,
    employee.dept                as department : String,
    employee.reputation      as reputation : Integer,
    employee.certsEarnedCount as badgesCount : Integer
  };

  @readonly entity Employees as projection on db.Employees {
    ID, name, dept, level, reputation,
    level as jobTitle   : String,
    dept  as department : String
  };

  function getCurrentUserProfile() returns UserProfiles;

  action likePost(postID : UUID)                     returns Posts;
  action unlikePost(postID : UUID)                    returns Posts;
  action addComment(postID : UUID, content : String)  returns Comments;
  action sharePost(postID : UUID)                     returns Posts;
}
