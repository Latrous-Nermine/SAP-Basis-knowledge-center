namespace aymax.knowledgehub;

using { cuid, managed } from '@sap/cds/common';
using { aymax.db.Employees } from './schema';

/* ──────────────── SOCIAL FEED ──────────────── */

entity Posts : cuid, managed {
  title       : String(250);
  content     : LargeString;
  type        : String(20) enum { knowledge; question; } default 'knowledge';
  status      : String(20) enum { draft; published; } default 'published';
  shareCount  : Integer default 0;
  author      : Association to Employees;
  room        : Association to Rooms;
  likes       : Composition of many Likes on likes.post = $self;
  comments    : Composition of many Comments on comments.post = $self;
  tags        : Composition of many Tags on tags.post = $self;
  docs        : Composition of many PostDocuments on docs.post = $self;
}

entity UserProfiles : cuid {
  employee : Association to Employees;
  bio      : String(500);
  avatarUrl: String;
}

entity Tags : cuid {
  post : Association to Posts;
  name : String(50);
}

entity Rooms : cuid {
  name           : String(100);
  description    : String(250);
  isPrivate      : Boolean default false;
  followersCount : Integer default 0;
  posts          : Association to many Posts on posts.room = $self;
}

entity Comments : cuid, managed {
  post    : Association to Posts;
  author  : Association to Employees;
  content : String(1000);
}

entity Likes : cuid {
  post   : Association to Posts;
  author : Association to Employees;
}

entity PostDocuments : cuid {
  post : Association to Posts;
  name : String(200);
  size : String(20);   // display string, e.g. "2.4 MB"
  type : String(10);   // pdf, zip, doc, docx, png, jpg...
  url  : String;
}
