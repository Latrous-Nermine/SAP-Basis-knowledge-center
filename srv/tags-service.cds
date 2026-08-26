using { aymax.knowledgehub as kh } from '../db/schema';

// Nermine's original had no @requires/@restrict here - added per
// CLAUDE.md §7 rule 1, same minimum-bar fix as feed-service.cds.
// Finer per-room/per-author write restrictions are a team decision,
// not added unilaterally here - see TODO-INTEGRATION.md.
@path: '/odata/v4/tags'
@requires: 'authenticated-user'
service TagsService {

  entity Tags         as projection on kh.Tags;
  entity PostTags     as projection on kh.PostTags;
  entity QuestionTags as projection on kh.QuestionTags;

  // --- ACTIONS TAGS ---
  action createTag(name : String, color : String, icon : String, description : String) returns Tags;
  action updateTag(tagID : UUID, name : String, color : String, icon : String, description : String) returns Boolean;
  action deleteTag(tagID : UUID)                                               returns Boolean;
  action mergeTags(sourceTagID : UUID, targetTagID : UUID)                    returns Boolean;
  action addTagToPost(tagID : UUID, postID : UUID)                            returns Boolean;
  action removeTagFromPost(tagID : UUID, postID : UUID)                       returns Boolean;
  action addTagToQuestion(tagID : UUID, questionID : UUID)                    returns Boolean;
  action removeTagFromQuestion(tagID : UUID, questionID : UUID)               returns Boolean;
  // Knowledge Centre (Lot 2, 2026-08): mirrors addTagToPost/addTagToQuestion
  // above exactly. KnowledgeItemTags itself is @readonly in
  // knowledge-service.cds (like PostTags/QuestionTags are in their own
  // services) - this action is the real write path.
  action addTagToItem(tagID : UUID, itemID : UUID)                           returns Boolean;
  action removeTagFromItem(tagID : UUID, itemID : UUID)                      returns Boolean;

  // --- FONCTIONS ---
  function searchTags(query : String)              returns many Tags;
  function getTrendingTags(limit : Integer)        returns many Tags;
  function getTagStats(tagID : UUID)               returns Tags;
}
