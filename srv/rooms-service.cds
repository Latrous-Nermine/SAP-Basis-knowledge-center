using { aymax.knowledgehub as kh } from '../db/schema';

// Nermine's original had no @requires/@restrict here - added per
// CLAUDE.md §7 rule 1, same minimum-bar fix as feed-service.cds.
// Finer per-room/per-author write restrictions are a team decision,
// not added unilaterally here - see TODO-INTEGRATION.md.
@path: '/odata/v4/rooms'
@requires: 'authenticated-user'
service RoomsService {

  type RoomStats {
    memberCount   : Integer;
    postCount     : Integer;
    questionCount : Integer;
    stageCount    : Integer;
  }

  entity Rooms         as projection on kh.Rooms {
    *,
    false as isJoined : Boolean
  };
  entity RoomMembers   as projection on kh.RoomMembers;
  entity RoomStages    as projection on kh.RoomStages;
  entity PostStageHistory as projection on kh.PostStageHistory;
  entity UserProfiles  as projection on kh.UserProfiles;
  entity Posts         as projection on kh.Posts {
    *,
    false as isLikedByMe : Boolean
  };
  entity RoomTopics    as projection on kh.RoomTopics;
  entity Topics        as projection on kh.Topics;

  // --- ACTIONS MEMBRES ---
  action joinRoom(roomID : UUID)                                                    returns Boolean;
  action leaveRoom(roomID : UUID)                                                   returns Boolean;
  action inviteMember(roomID : UUID, userID : String)                               returns Boolean;
  action removeMember(roomID : UUID, memberID : UUID)                               returns Boolean;
  action updateMemberRole(memberID : UUID, role : String)                           returns Boolean;

  // --- ACTIONS STAGES ---
  action changePostStage(postID : UUID, stageID : UUID, comment : String)          returns Boolean;
  action createStage(roomID : UUID, name : String, color : String, icon : String, order : Integer, isDefault : Boolean) returns RoomStages;
  action updateStage(stageID : UUID, name : String, color : String, icon : String, order : Integer) returns Boolean;
  action deleteStage(stageID : UUID)                                                returns Boolean;

  // --- FONCTIONS ---
  function getRoomStats(roomID : UUID)  returns RoomStats;
  function getMyRooms()                 returns many Rooms;
  function getStageHistory(postID : UUID) returns many PostStageHistory;
}
