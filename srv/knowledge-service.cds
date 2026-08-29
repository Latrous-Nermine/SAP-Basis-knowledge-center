using { aymax.knowledgehub as kh } from '../db/lot2';

/**
 * ============================================================
 *  KnowledgeService  —  LOT 2
 * ============================================================
 *  Exposed at  /odata/v4/knowledge
 *
 *  Row-level rule (the whole security model for this module):
 *  a KnowledgeItem is visible if it's approved, OR the caller is
 *  one of its contributors. Everything else (draft/pending/rejected
 *  items belonging to someone else) must not even be readable via
 *  a hand-crafted OData URL.
 * ============================================================
 */
@path    : '/odata/v4/knowledge'
@requires: 'authenticated-user'
service KnowledgeService {

  @restrict: [
    { grant: 'READ',              where: 'status = ''approved'' or exists contributors[user_userID = $user.id]' },
    // Knowledge Centre feature evolution (2026-08): without this, a manager
    // could approve/reject (already @requires: 'Manager' below)
    // but never SEE a pending item to act on unless they happened to also
    // be a contributor - purely additive, the rule above is untouched.
    { grant: 'READ',               where: 'status = ''pending''', to: ['Manager', 'Administrator'] },
    { grant: ['CREATE', 'UPDATE'], to: ['Employee', 'Manager', 'Administrator'] },
    { grant: 'DELETE', where: 'status = ''draft'' and exists contributors[user_userID = $user.id]' },
    { grant: 'DELETE',             to: ['Administrator'] }
  ]
  entity KnowledgeItems as projection on kh.KnowledgeItems {
    *,
    contributors  : redirected to KnowledgeContributors,
    tags          : redirected to KnowledgeItemTags,
    attachments   : redirected to KnowledgeAttachments,
    relatedItems  : redirected to KnowledgeRelations,
    contributions : redirected to KnowledgeContributions,
    comments      : redirected to ItemComments,
    /** +1 / -1 / null - the caller's own vote, computed in a batched
        after-READ hook (same pattern as PeopleService's isFollowedByMe),
        never via $expand of KnowledgeVotes: that entity's own @restrict
        (correctly enforced on a DIRECT query) turned out NOT to be
        enforced when reached through $expand from here - found via an
        actual cross-user test, not assumed. A virtual field sidesteps
        the gap entirely instead of trying to force expand-time restrict
        to behave differently. */
    virtual myVote : Integer,

    /** Card/detail byline (2026-08 redesign) - flattened onto the ITEM
        itself, not left for the UI to derive from the `contributors`
        $expand at render time. Found empirically: a client-side composite
        binding whose parts include a collection-valued nav property
        (`contributors`) never resolves - every part comes back `undefined`
        to the formatter, with or without explicit `targetType`, tested
        extensively (see git history / session notes on this file's UI
        counterpart). Precomputing flat scalars here sidesteps the whole
        class of bug: each of these is a plain single-part string binding
        client-side, the same proven-reliable shape as categoryLabel/
        statusLabel already use. */
    virtual contributorsLabel            : String,
    virtual primaryContributorAvatarSrc  : String,
    virtual primaryContributorInitials   : String,
    virtual primaryContributorColor      : String,

    /** Real card-footer metadata (2026-08 "real visuals" pass), computed
        in the same after-READ hook - counts only, never the full
        comments/attachments $expand (list views don't need the content,
        only how many). */
    virtual commentsCount    : Integer,
    virtual attachmentsCount : Integer
  };

  // Each of these four is a detail table of KnowledgeItems (item_ID FK) -
  // without its own @restrict, it was directly queryable by any
  // authenticated user regardless of the parent item's status/confidentiality,
  // silently defeating the READ rule above via a hand-crafted URL to the
  // sub-entity instead of KnowledgeItems itself. Same where clause, walked
  // through the `item` association.
  @readonly
  @restrict: [
    { grant: 'READ', where: 'item.status = ''approved'' or exists item.contributors[user_userID = $user.id]' }
  ]
  entity KnowledgeContributors as projection on kh.KnowledgeContributors {
    *,
    /** Resolved in the same after-READ hook as KnowledgeItems.myVote -
        must be declared here or OData strips it from the response, same
        reason myVote needed its own virtual declaration. */
    virtual displayName : String,
    /** Card/detail avatar (2026-08 redesign) - same reason: the hook
        already sets it, but a field OData doesn't know about is dropped
        from the response regardless of what the handler puts on the row. */
    virtual avatarMimeType : String
  };

  @readonly
  @restrict: [
    { grant: 'READ', where: 'item.status = ''approved'' or exists item.contributors[user_userID = $user.id]' }
  ]
  entity KnowledgeItemTags as projection on kh.KnowledgeItemTags;

  /** Tags itself (name/color/...) - not exposed anywhere else in this
      service, so KnowledgeItemTags.tag was being silently stripped from
      the OData metadata as a navigation property pointing outside the
      service's own entity set ($expand=tags($expand=tag) failed with
      "Navigation property tag does not exist"). Read-only reference data,
      same plain unrestricted projection Feed/Rooms already use for it. */
  @readonly
  entity Tags as projection on kh.Tags;

  /** Comments themselves (content/createdAt/author_userID) already came
      through $expand=comments without an explicit projection here - CAP
      auto-exposes an association target's own columns. This projection
      only exists to carry two NEW virtual fields (author name + real
      photo, resolved in the same after-READ batch as
      KnowledgeContributors.displayName/avatarMimeType) - same reason
      KnowledgeContributors needed its own explicit projection instead of
      a bare `*`: an entity with no projection in THIS service has nowhere
      to declare a virtual field on. Lot 1's own Comments entity/schema is
      untouched - this is a read-only reference into it, same pattern as
      Tags above. */
  @readonly
  @restrict: [
    { grant: 'READ', where: 'knowledgeItem.status = ''approved'' or exists knowledgeItem.contributors[user_userID = $user.id]' }
  ]
  entity ItemComments as projection on kh.Comments {
    *,
    virtual authorDisplayName    : String,
    virtual authorAvatarMimeType : String
  };

  // CREATE (not @readonly, unlike its three siblings above): real upload
  // needs a write path. Role-gated the same as KnowledgeItems; the handler
  // additionally checks the caller is actually a contributor on the target
  // item (defense in depth, same pattern as submitForReview's isContributor
  // check - a role alone doesn't prove you own THIS item).
  // UPDATE is required too, found empirically, not obvious upfront: a
  // media entity's binary content (KnowledgeAttachments.content) is
  // written via a PUT to its own .../content stream endpoint, and CAP
  // authorizes that as an UPDATE on the row, not as part of CREATE - the
  // metadata insert alone isn't the whole upload. Scoped to contributors
  // only, same as DELETE, so this permits re-uploading your own
  // attachment's bytes but not tampering with someone else's.
  @restrict: [
    { grant: 'READ',   where: 'item.status = ''approved'' or exists item.contributors[user_userID = $user.id]' },
    { grant: 'CREATE', to: ['Employee', 'Manager', 'Administrator'] },
    { grant: 'UPDATE', where: 'exists item.contributors[user_userID = $user.id]' },
    { grant: 'DELETE', where: 'exists item.contributors[user_userID = $user.id]' },
    { grant: 'DELETE', to: ['Administrator'] }
  ]
  entity KnowledgeAttachments as projection on kh.KnowledgeAttachments;

  @readonly
  @restrict: [
    { grant: 'READ', where: 'item.status = ''approved'' or exists item.contributors[user_userID = $user.id]' }
  ]
  entity KnowledgeRelations as projection on kh.KnowledgeRelations;

  // KnowledgeVotes is deliberately NOT exposed as a service entity at all
  // (no projection here) - every write already goes through
  // voteItem/removeVote below against the DB-level entity directly, and
  // reads go through KnowledgeItems.myVote (a batched after-READ virtual
  // field, see the service's own comment on it above), not $expand. One
  // fewer entity that could be queried or expanded in a way its own
  // restrict doesn't actually cover.

  // Read-only for the same reason: submitContribution/approveContribution/
  // rejectContribution below are the only write path, so the approval
  // rules (status transition, dedupe against KnowledgeContributors) live
  // in one place. Visible to whoever submitted it, anyone already a
  // contributor on the target item, and managers/admins who review it.
  @readonly
  @restrict: [
    { grant: 'READ', where: 'submittedBy_userID = $user.id or exists item.contributors[user_userID = $user.id]' },
    { grant: 'READ', to: ['Manager', 'Administrator'] }
  ]
  entity KnowledgeContributions as projection on kh.KnowledgeContributions;

  @readonly
  entity Topics as projection on kh.KnowledgeTopics;

  /** Category tab counts, computed after the same @restrict filtering
      as the list itself — never before (CLAUDE.md §7 rule 6). */
  function getCategoryCounts() returns array of {
    category : String;
    count    : Integer;
  };

  /** Sidebar "Documents liés". */
  function getRelated(itemID : UUID) returns array of {
    ID    : UUID;
    title : String;
  };

  /** draft/rejected -> pending. Author only. */
  action submitForReview(itemID : UUID) returns Boolean;

  /** pending -> approved / rejected. Knowledge.Approve scope only. */
  @requires: 'Manager'
  action approveItem(itemID : UUID) returns Boolean;
  @requires: 'Manager'
  action rejectItem(itemID : UUID) returns Boolean;

  /** Comment thread on a Knowledge Center item (Contract B - extends
      Lot 1's Comments, does not create a second comment entity). */
  action addComment(itemID : UUID, content : String) returns UUID;

  /** value must be +1 or -1 - anything else is rejected server-side.
      Only on status = 'approved' items; changing an existing vote and
      casting a fresh one are the same call (upsert), never two. */
  action voteItem(itemID : UUID, value : Integer) returns Boolean;

  /** No-op (not an error) if the caller had no active vote. */
  action removeVote(itemID : UUID) returns Boolean;

  /** Propose an addition to an ALREADY APPROVED item. Distinct from
      creating a new KnowledgeItem, which is unchanged. */
  action submitContribution(itemID : UUID, content : String) returns UUID;

  /** Marks the contribution approved and appends submittedBy to
      KnowledgeContributors if not already present. Never touches
      KnowledgeItems.content. */
  @requires: 'Manager'
  action approveContribution(contributionID : UUID) returns Boolean;
  @requires: 'Manager'
  action rejectContribution(contributionID : UUID) returns Boolean;

  /**
   * Solved question -> new KnowledgeItem (TODO-INTEGRATION.md I-07).
   * Lot 3's Questions entity does not exist yet, so this throws a clear
   * "not yet available" error rather than silently doing nothing -
   * CLAUDE.md §10: no placeholder logic that fails silently.
   */
  @requires: 'Manager'
  action promoteQuestion(questionID : UUID) returns UUID;
}
