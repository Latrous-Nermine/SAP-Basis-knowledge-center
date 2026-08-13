namespace aymax.knowledgehub;

using { cuid, managed } from '@sap/cds/common';

// ============================================================
// PROFILS UTILISATEURS (enrichissement XSUAA, pas de login)
// ============================================================
entity UserProfiles {
  key userID      : String(255);          // ID XSUAA / IAS
      email       : String(255);
      displayName : String(100);
      avatarUrl   : String(500);
      department  : String(100);
      jobTitle    : String(100);
      reputation  : Integer default 0;    // Points (ex: 1240)
      badgesCount : Integer default 0;    // Badges (ex: 9)
      isActive    : Boolean default true;

      posts       : Association to many Posts on posts.author = $self;
      comments    : Association to many Comments on comments.author = $self;
      questions   : Association to many Questions on questions.author = $self;
      answers     : Association to many Answers on answers.author = $self;
}

// ============================================================
// ROOMS / SUJETS (ex: SAP BTP, Developpement Digital...)
// ============================================================
entity Rooms : cuid {
  name            : String(100)  @mandatory;
  description     : String(500);
  category        : String(50);
  avatarUrl       : String(500);
  visibility      : String(20) enum { public; private; stage } default 'public';
  followersCount  : Integer default 0;
  memberCount     : Integer default 0;
  postCount       : Integer default 0;
  questionCount   : Integer default 0;

  // Associations
  posts           : Association to many Posts on posts.room = $self;
  members         : Composition of many RoomMembers on members.room = $self;
  stages          : Composition of many RoomStages on stages.room = $self;
  topics          : Composition of many RoomTopics on topics.room = $self;
}

// ============================================================
// ROOM MEMBERS
// ============================================================
entity RoomMembers : cuid {
  room        : Association to Rooms @mandatory;
  userID      : String(255) @mandatory;       // XSUAA ID
  role        : String(20) enum { owner; admin; member } default 'member';
  joinedAt    : Timestamp;
  userProfile : Association to UserProfiles on userProfile.userID = userID;
}

// ============================================================
// ROOM STAGES (Pipeline : Draft -> Review -> Approved -> Published -> Archived)
// ============================================================
entity RoomStages : cuid {
  room        : Association to Rooms @mandatory;
  name        : String(100) @mandatory;
  description : String(500);
  color       : String(7) default '#1E3A8A';  // Hex
  icon        : String(100) default 'sap-icon://workflow-tasks';
  order       : Integer default 0;
  isDefault   : Boolean default false;
  posts       : Association to many Posts on posts.stage = $self;
}

// ============================================================
// TOPICS (Themes transversaux)
// ============================================================
entity Topics : cuid {
  name          : String(100) @mandatory @assert.unique;
  description   : String(500);
  color         : String(7) default '#1E3A8A';  // Hex
  icon          : String(100) default 'sap-icon://tag';
  postCount     : Integer default 0;
  questionCount : Integer default 0;
  roomCount     : Integer default 0;

  // Associations
  posts         : Composition of many PostTopics on posts.topic = $self;
  rooms         : Composition of many RoomTopics on rooms.topic = $self;
  questions     : Composition of many QuestionTopics on questions.topic = $self;
}

// ============================================================
// LIAISONS TOPICS
// ============================================================
entity PostTopics : cuid {
  post  : Association to Posts;
  topic : Association to Topics;
}

entity RoomTopics : cuid {
  room  : Association to Rooms;
  topic : Association to Topics;
}

entity QuestionTopics : cuid {
  question : Association to Questions;
  topic    : Association to Topics;
}

// ============================================================
// POSTS (Fil d'actualite)
// ============================================================
entity Posts : cuid, managed {
  title           : String(500);          // Titre optionnel de la publication
  content         : LargeString @mandatory;
  summary         : LargeString;          // Résumé automatique généré par l'IA (Gemini)
  type            : String(20) enum {
    knowledge; question; announcement
  } default 'knowledge';
  status          : String(20) enum {
    draft; published; archived
  } default 'published';

  // Compteurs denormalises (performance feed)
  viewCount       : Integer64 default 0;
  likeCount       : Integer64 default 0;
  dislikeCount    : Integer64 default 0;
  commentCount    : Integer64 default 0;
  shareCount      : Integer64 default 0;

  // Associations
  author          : Association to UserProfiles;
  room            : Association to Rooms;
  stage           : Association to RoomStages;
  topic           : Association to Topics;
  repostOf        : Association to Posts;     // Publication d'origine (si c'est une republication)
  tags            : Composition of many PostTags on tags.post = $self;
  likes           : Composition of many Likes on likes.post = $self;
  dislikes        : Composition of many Dislikes on dislikes.post = $self;
  comments        : Composition of many Comments on comments.post = $self;
  documents       : Composition of many PostDocuments on documents.post = $self;
  stageHistory    : Composition of many PostStageHistory on stageHistory.post = $self;
  topics          : Composition of many PostTopics on topics.post = $self;
}

// ============================================================
// HISTORIQUE CHANGEMENTS STAGE
// ============================================================
entity PostStageHistory : cuid {
  post        : Association to Posts;
  fromStage   : Association to RoomStages;
  toStage     : Association to RoomStages;
  changedBy   : String(255);   // XSUAA userID
  changedAt   : Timestamp;
  comment     : String(500);
}

// ============================================================
// REPUBLICATIONS (repost) — suivi original / repost / utilisateur
// ============================================================
entity PostReposts : cuid {
  original    : Association to Posts @mandatory;
  repost      : Association to Posts @mandatory;
  userID      : String(255) @mandatory;   // XSUAA ID
  repostedAt  : Timestamp;
}

// ============================================================
// TAGS
// ============================================================
entity Tags : cuid {
  name        : String(50) @assert.unique;
  color       : String(7) default '#1E3A8A';  // Hex
  icon        : String(100);
  description : String(500);
  usageCount  : Integer default 0;
}

entity PostTags : cuid {
  post : Association to Posts;
  tag  : Association to Tags;
}

entity QuestionTags : cuid {
  question : Association to Questions;
  tag      : Association to Tags;
}

// ============================================================
// QUESTIONS (style StackOverflow)
// ============================================================
entity Questions : cuid, managed {
  title          : String(500) @mandatory;
  content        : LargeString @mandatory;
  status         : String(20) enum {
    open; closed; resolved
  } default 'open';

  // Compteurs denormalises
  viewCount      : Integer64 default 0;
  answerCount    : Integer64 default 0;
  voteCount      : Integer default 0;

  // Associations
  author         : Association to UserProfiles;
  room           : Association to Rooms;
  acceptedAnswer : Association to Answers;
  tags           : Composition of many QuestionTags on tags.question = $self;
  topics         : Composition of many QuestionTopics on topics.question = $self;
  answers        : Composition of many Answers on answers.question = $self;
  votes          : Composition of many QuestionVotes on votes.question = $self;
  documents      : Composition of many QuestionDocuments on documents.question = $self;
}

// ============================================================
// REPONSES
// ============================================================
entity Answers : cuid, managed {
  question   : Association to Questions;
  author     : Association to UserProfiles;
  content    : LargeString @mandatory;
  voteCount  : Integer default 0;
  isAccepted : Boolean default false;
  votes      : Composition of many AnswerVotes on votes.answer = $self;
  comments   : Composition of many Comments on comments.answer = $self;
}

// ============================================================
// VOTES
// ============================================================
entity QuestionVotes : cuid {
  question : Association to Questions;
  userID   : String(255);   // XSUAA ID
  value    : Integer;       // +1 ou -1
}

entity AnswerVotes : cuid {
  answer : Association to Answers;
  userID : String(255);   // XSUAA ID
  value  : Integer;       // +1 ou -1
}

// ============================================================
// COMMENTAIRES (hierarchiques — Posts ET Answers)
// ============================================================
entity Comments : cuid, managed {
  post    : Association to Posts;
  answer  : Association to Answers;   // Commentaire sur une reponse
  parent  : Association to Comments;  // Reponse a un commentaire
  author  : Association to UserProfiles;
  content : String(2000) @mandatory;
  likes   : Integer default 0;
}

// ============================================================
// LIKES
// ============================================================
entity Likes : cuid {
  post   : Association to Posts;
  userID : String(255);  // XSUAA ID
}

// ============================================================
// DISLIKES
// ============================================================
entity Dislikes : cuid {
  post   : Association to Posts;
  userID : String(255);  // XSUAA ID
}

// ============================================================
// FAVORIS (Posts ou Questions)
// ============================================================
entity Favorites : cuid {
  userID     : String(255);    // XSUAA ID
  targetType : String(20);     // 'post' ou 'question'
  targetID   : UUID;           // ID du Post ou Question
  savedAt    : Timestamp;
}

// ============================================================
// DOCUMENTS JOINTS (Posts)
// ============================================================
entity PostDocuments : cuid, managed {
  post     : Association to Posts;
  fileName : String(255);
  fileUrl  : String(1000);   // URL signee DMS ou data URI
  fileType : String(50);     // pdf, docx...
  fileSize : Integer;        // en octets
  summary  : LargeString;    // Résumé IA du document
}

// ============================================================
// DOCUMENTS JOINTS (Questions)
// ============================================================
entity QuestionDocuments : cuid, managed {
  question : Association to Questions;
  fileName : String(255);
  fileUrl  : String(1000);
  fileType : String(50);
  fileSize : Integer;
}

// ============================================================
// SUIVIS (Utilisateur suit un Room ou un autre utilisateur)
// ============================================================
entity Follows : cuid {
  userID       : String(255);
  room         : Association to Rooms;
  followedUser : Association to UserProfiles;
}