using { aymax.knowledgehub as kh } from '../db/schema';

// Nermine's original had no @requires/@restrict here - added per
// CLAUDE.md §7 rule 1, same minimum-bar fix as feed-service.cds.
// Finer per-room/per-author write restrictions are a team decision,
// not added unilaterally here - see TODO-INTEGRATION.md.
@path: '/odata/v4/topics'
@requires: 'authenticated-user'
service TopicsService {

  entity Topics        as projection on kh.Topics;
  entity PostTopics    as projection on kh.PostTopics;
  entity RoomTopics    as projection on kh.RoomTopics;
  entity QuestionTopics as projection on kh.QuestionTopics;
  entity UserProfiles  as projection on kh.UserProfiles;

  // --- ACTIONS TOPICS ---
  action createTopic(name : String, description : String, color : String, icon : String) returns Topics;
  action updateTopic(topicID : UUID, name : String, description : String, color : String, icon : String) returns Boolean;
  action deleteTopic(topicID : UUID)                                               returns Boolean;
  action addTopicToPost(topicID : UUID, postID : UUID)                            returns Boolean;
  action removeTopicFromPost(topicID : UUID, postID : UUID)                       returns Boolean;
  action addTopicToRoom(topicID : UUID, roomID : UUID)                            returns Boolean;
  action removeTopicFromRoom(topicID : UUID, roomID : UUID)                       returns Boolean;
  action addTopicToQuestion(topicID : UUID, questionID : UUID)                    returns Boolean;
  action removeTopicFromQuestion(topicID : UUID, questionID : UUID)               returns Boolean;

  // --- FONCTIONS ---
  function getTopicStats(topicID : UUID) returns Topics;
  function getPopularTopics(limit : Integer) returns many Topics;
}
