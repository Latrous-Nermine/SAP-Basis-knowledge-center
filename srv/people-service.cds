using { aymax.knowledgehub as kh } from '../db/lot2';

/**
 * ============================================================
 *  PeopleService  —  LOT 2
 * ============================================================
 *  Exposed at /odata/v4/people
 *
 *  Profiles are read-only: no editing, no settings, no avatar
 *  upload. Every authenticated user can read every profile - there
 *  is no per-row restriction here, unlike KnowledgeItems, because
 *  nothing on a profile is confidential. The only mutations this
 *  service exposes are Follow/Unfollow, which write to Lot 1's
 *  `Follows` entity, never to UserProfiles.
 * ============================================================
 */
@path    : '/odata/v4/people'
@requires: 'authenticated-user'
service PeopleService {

  @readonly
  @restrict: [
    { grant: 'READ', to: ['Employee', 'Manager', 'HR', 'Administrator', 'Intern'] }
  ]
  entity People as projection on kh.UserProfiles {
    *,
    skills         : redirected to UserSkills,
    userBadges     : redirected to UserBadges,
    certifications : redirected to UserCertifications,
    technologies   : redirected to UserTechnologies,
    virtual followersCount     : Integer,
    virtual followingCount     : Integer,
    virtual isFollowedByMe     : Boolean,
    virtual expertiseLevel     : String(20),
    /** Experts card footer ("64 contributions") - count of
        KnowledgeContributors rows, batched in the same after-READ hook
        as followersCount/followingCount. Not persisted: same reasoning
        as expertiseLevel, this is cheap to compute per page load and
        would otherwise need its own reconciliation workflow. */
    virtual contributionsCount : Integer
  } excluding { isActive, posts, comments, reputationEvents, followers, following };

  @readonly
  entity UserSkills as projection on kh.UserSkills;

  @readonly
  entity Badges as projection on kh.Badges;

  @readonly
  entity UserBadges as projection on kh.UserBadges { *, badge : redirected to Badges };

  @readonly
  entity Certifications as projection on kh.Certifications;

  @readonly
  entity UserCertifications as projection on kh.UserCertifications { *, certification : redirected to Certifications };

  /** SAP Technology filter facet (Experts). Flattens tag.name/tag.color
      one level so `$filter=technologies/any(t:t/technologyName eq '...')`
      stays a single-hop lambda - reliably translated by CAP, unlike a
      two-hop `technologies/any(t:t/tag/name eq ...)`. Read-only: no
      client can create/update/delete these rows directly, matching the
      "no write endpoint yet" decision for this module. */
  @readonly
  entity UserTechnologies as projection on kh.UserTechnologyTags {
    *,
    tag.name  as technologyName : String(50),
    tag.color as technologyColor : String(7)
  };

  /** Activity feed for a profile - assembled from entities that
      already exist (KnowledgeContributors, Comments,
      KnowledgeAttachments, Follows), not a duplicate ledger.
      "Answered question" is not included yet: Lot 3's Questions
      entity does not exist (TODO-INTEGRATION.md). */
  function getActivity(userID : String, limit : Integer) returns array of {
    text       : String;
    occurredAt : Timestamp;
  };

  /** Grouped +points ledger for the "Timeline de contribution" dialog. */
  function getContributionTimeline(userID : String, months : Integer) returns array of {
    monthLabel : String;
    points     : Integer;
    label      : String;
    occurredAt : Timestamp;
  };

  /** badges/publications/contributions split for the KPI cards. */
  function getScoreBreakdown(userID : String) returns {
    badges        : Integer;
    publications  : Integer;
    contributions : Integer;
  };

  action followUser(userID : String) returns Boolean;
  action unfollowUser(userID : String) returns Boolean;

  /** The caller's own userID - lets the Profile app answer "am I viewing my
      own profile?" without a cross-service call to Lot 1's FeedService for
      something this service can answer trivially from req.user itself. */
  function getMyUserID() returns String;

  /** The caller's own effective role - used by the shared shell to hide
      NONE-access nav links per the permission matrix. Deliberately
      resolved from req.user.is(), same as every @restrict check, so it
      reflects the real role - including the dev-only role preview
      override (CLAUDE.md §5 C7), since that rewrites the actual
      Authorization header before auth runs, not just what the client
      claims. Not a duplicate of getDashboard()'s own `role` field:
      that call fetches a whole dashboard payload the shell doesn't
      need just to gate five nav buttons. */
  function getMyRole() returns String;
}
