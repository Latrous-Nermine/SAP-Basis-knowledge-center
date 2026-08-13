using { aymax.knowledgehub as kh } from '../db/schema';

// Nermine's original had no @requires/@restrict here - added per
// CLAUDE.md §7 rule 1, same minimum-bar fix as feed-service.cds.
// Finer per-room/per-author write restrictions are a team decision,
// not added unilaterally here - see TODO-INTEGRATION.md.
@path: '/odata/v4/questions'
@requires: 'authenticated-user'
service QuestionsService {

  entity Questions       as projection on kh.Questions {
    *,
    false as isVotedByMe     : Boolean,
    0     as myVoteValue     : Integer
  };
  entity Answers         as projection on kh.Answers {
    *,
    false as isVotedByMe : Boolean,
    0     as myVoteValue : Integer
  };
  entity QuestionVotes   as projection on kh.QuestionVotes;
  entity AnswerVotes     as projection on kh.AnswerVotes;
  entity QuestionTags    as projection on kh.QuestionTags;
  entity QuestionTopics  as projection on kh.QuestionTopics;
  entity QuestionDocuments as projection on kh.QuestionDocuments;
  entity Comments        as projection on kh.Comments;
  entity Tags            as projection on kh.Tags;
  entity Topics          as projection on kh.Topics;
  entity Rooms           as projection on kh.Rooms;
  entity UserProfiles    as projection on kh.UserProfiles;

  // --- ACTIONS QUESTIONS ---
  action createQuestion(
    title   : String,
    content : String,
    roomID  : UUID,
    tagIDs  : many UUID,
    topicIDs: many UUID
  ) returns Questions;

  action updateQuestion(
    questionID : UUID,
    title      : String,
    content    : String
  ) returns Boolean;

  action deleteQuestion(questionID : UUID)                               returns Boolean;
  action closeQuestion(questionID : UUID)                                returns Boolean;
  action resolveQuestion(questionID : UUID)                              returns Boolean;
  action reopenQuestion(questionID : UUID)                               returns Boolean;

  action voteQuestion(questionID : UUID, value : Integer)                returns Integer;
  action cancelVoteQuestion(questionID : UUID)                           returns Integer;

  // --- ACTIONS REPONSES ---
  action createAnswer(questionID : UUID, content : String)               returns Answers;
  action updateAnswer(answerID : UUID, content : String)                 returns Boolean;
  action deleteAnswer(answerID : UUID)                                   returns Boolean;
  action acceptAnswer(questionID : UUID, answerID : UUID)                returns Boolean;
  action voteAnswer(answerID : UUID, value : Integer)                    returns Integer;
  action cancelVoteAnswer(answerID : UUID)                               returns Integer;

  // --- ACTIONS COMMENTAIRES ---
  action addCommentToQuestion(questionID : UUID, content : String)       returns Comments;
  action addCommentToAnswer(answerID : UUID, content : String)           returns Comments;
  action deleteComment(commentID : UUID)                                 returns Boolean;

  // --- FONCTIONS ---
  function searchQuestions(
    query   : String,
    tagID   : UUID,
    topicID : UUID,
    roomID  : UUID,
    status  : String,
    sortBy  : String,
    limit   : Integer,
    skip    : Integer
  ) returns many Questions;

  function getRelatedQuestions(questionID : UUID, limit : Integer) returns many Questions;
  function getMyQuestions() returns many Questions;
}
