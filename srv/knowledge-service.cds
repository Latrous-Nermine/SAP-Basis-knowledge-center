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
    // could approve/reject (already @requires: 'DepartmentManager' below)
    // but never SEE a pending item to act on unless they happened to also
    // be a contributor - purely additive, the rule above is untouched.
    { grant: 'READ',               where: 'status = ''pending''', to: ['DepartmentManager', 'Admin'] },
    { grant: ['CREATE', 'UPDATE'], to: ['Employee', 'DepartmentManager', 'Admin'] },
    { grant: 'DELETE', where: 'status = ''draft'' and exists contributors[user_userID = $user.id]' },
    { grant: 'DELETE',             to: ['Admin'] }
  ]
  entity KnowledgeItems as projection on kh.KnowledgeItems {
    *,
    contributors  : redirected to KnowledgeContributors,
    tags          : redirected to KnowledgeItemTags,
    attachments   : redirected to KnowledgeAttachments,
    relatedItems  : redirected to KnowledgeRelations,
    contributions : redirected to KnowledgeContributions,
    /** +1 / -1 / null - the caller's own vote, computed in a batched
        after-READ hook (same pattern as PeopleService's isFollowedByMe),
        never via $expand of KnowledgeVotes: that entity's own @restrict
        (correctly enforced on a DIRECT query) turned out NOT to be
        enforced when reached through $expand from here - found via an
        actual cross-user test, not assumed. A virtual field sidesteps
        the gap entirely instead of trying to force expand-time restrict
        to behave differently. */
    virtual myVote : Integer
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
    virtual displayName : String
  };

  @readonly
  @restrict: [
    { grant: 'READ', where: 'item.status = ''approved'' or exists item.contributors[user_userID = $user.id]' }
  ]
  entity KnowledgeItemTags as projection on kh.KnowledgeItemTags;

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
    { grant: 'CREATE', to: ['Employee', 'DepartmentManager', 'Admin'] },
    { grant: 'UPDATE', where: 'exists item.contributors[user_userID = $user.id]' },
    { grant: 'DELETE', where: 'exists item.contributors[user_userID = $user.id]' },
    { grant: 'DELETE', to: ['Admin'] }
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
    { grant: 'READ', to: ['DepartmentManager', 'Admin'] }
  ]
  entity KnowledgeContributions as projection on kh.KnowledgeContributions;

  @readonly
  entity Topics as projection on kh.Topics;

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
  @requires: 'DepartmentManager'
  action approveItem(itemID : UUID) returns Boolean;
  @requires: 'DepartmentManager'
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
  @requires: 'DepartmentManager'
  action approveContribution(contributionID : UUID) returns Boolean;
  @requires: 'DepartmentManager'
  action rejectContribution(contributionID : UUID) returns Boolean;

  /**
   * Solved question -> new KnowledgeItem (TODO-INTEGRATION.md I-07).
   * Lot 3's Questions entity does not exist yet, so this throws a clear
   * "not yet available" error rather than silently doing nothing -
   * CLAUDE.md §10: no placeholder logic that fails silently.
   */
  @requires: 'DepartmentManager'
  action promoteQuestion(questionID : UUID) returns UUID;
}
