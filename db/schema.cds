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
      badgesCount : Integer default 0;      // Badges (ex: 9)
      isActive    : Boolean default true;
      
      posts       : Association to many Posts on posts.author = $self;
      comments    : Association to many Comments on comments.author = $self;
}

// ============================================================
// ROOMS / SUJETS (ex: SAP BTP, Développement Digital...)
// ============================================================
entity Rooms : cuid {
  name            : String(100);
  description     : String(500);
  category        : String(50);
  followersCount  : Integer default 0;
  posts           : Association to many Posts on posts.room = $self;
}

// ============================================================
// POSTS (Fil d'actualité)
// ============================================================
entity Posts : cuid, managed {
  content         : LargeString @mandatory;
  type            : String(20) enum {
    knowledge; question; announcement
  } default 'knowledge';
  status          : String(20) enum {
    draft; published; archived
  } default 'published';
  
  // Compteurs dénormalisés (performance feed)
  viewCount       : Integer64 default 0;
  likeCount       : Integer64 default 0;
  commentCount    : Integer64 default 0;
  shareCount      : Integer64 default 0;
  
  // Associations
  author          : Association to UserProfiles;
  room            : Association to Rooms;
  tags            : Composition of many PostTags on tags.post = $self;
  likes           : Composition of many Likes on likes.post = $self;
  comments        : Composition of many Comments on comments.post = $self;
  documents       : Composition of many PostDocuments on documents.post = $self;
}

// ============================================================
// TAGS
// ============================================================
entity Tags : cuid {
  name        : String(50) @assert.unique;
  color       : String(7);  // Hex: #1E3A8A
  usageCount  : Integer default 0;
}

entity PostTags : cuid {
  post : Association to Posts;
  tag  : Association to Tags;
}

// ============================================================
// COMMENTAIRES (hiérarchiques)
// ============================================================
entity Comments : cuid, managed {
  post    : Association to Posts;
  parent  : Association to Comments;  // Réponse à un commentaire
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
// DOCUMENTS JOINTS (référence DMS — binaire pas en base)
// ============================================================
entity PostDocuments : cuid, managed {
  post     : Association to Posts;
  fileName : String(255);
  fileUrl  : String(1000);   // URL signée DMS
  fileType : String(50);     // pdf, docx...
  fileSize : Integer;        // en octets
}

// ============================================================
// SUIVIS (Utilisateur suit un Room ou un autre utilisateur)
// ============================================================
entity Follows : cuid {
  userID       : String(255);
  room         : Association to Rooms;
  followedUser : Association to UserProfiles;
}