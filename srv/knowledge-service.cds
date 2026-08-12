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
    { grant: ['CREATE', 'UPDATE'], to: ['Employee', 'DepartmentManager', 'Admin'] },
    { grant: 'DELETE', where: 'status = ''draft'' and exists contributors[user_userID = $user.id]' },
    { grant: 'DELETE',             to: ['Admin'] }
  ]
  entity KnowledgeItems as projection on kh.KnowledgeItems {
    *,
    contributors : redirected to KnowledgeContributors,
    tags         : redirected to KnowledgeItemTags,
    attachments  : redirected to KnowledgeAttachments,
    relatedItems : redirected to KnowledgeRelations
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
  entity KnowledgeContributors as projection on kh.KnowledgeContributors;

  @readonly
  @restrict: [
    { grant: 'READ', where: 'item.status = ''approved'' or exists item.contributors[user_userID = $user.id]' }
  ]
  entity KnowledgeItemTags as projection on kh.KnowledgeItemTags;

  @readonly
  @restrict: [
    { grant: 'READ', where: 'item.status = ''approved'' or exists item.contributors[user_userID = $user.id]' }
  ]
  entity KnowledgeAttachments as projection on kh.KnowledgeAttachments;

  @readonly
  @restrict: [
    { grant: 'READ', where: 'item.status = ''approved'' or exists item.contributors[user_userID = $user.id]' }
  ]
  entity KnowledgeRelations as projection on kh.KnowledgeRelations;

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

  /**
   * Solved question -> new KnowledgeItem (TODO-INTEGRATION.md I-07).
   * Lot 3's Questions entity does not exist yet, so this throws a clear
   * "not yet available" error rather than silently doing nothing -
   * CLAUDE.md §10: no placeholder logic that fails silently.
   */
  @requires: 'DepartmentManager'
  action promoteQuestion(questionID : UUID) returns UUID;
}
