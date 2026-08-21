import cds from '@sap/cds';

/**
 * Award-reputation facade - the single way any Lot 2 workflow grants
 * reputation, mirroring notify.js's role for notifications (CLAUDE.md
 * §6 "Event ledger" pattern).
 *
 * Writes BOTH ReputationEvents (the append-only ledger - the source of
 * truth / audit trail) AND UserProfiles.reputation (the recomputable
 * display cache, CLAUDE.md §6) in the SAME call, so the two can never
 * drift apart the way they would if a caller updated one and forgot
 * the other.
 *
 * Unlike notify(), this deliberately does NOT use a detached
 * transaction: it only ever writes Lot 2's own tables (no cross-service
 * @requires boundary to cross the way raise() has), and reputation
 * SHOULD roll back together with the action that earned it if anything
 * later in the same request fails - the two must stay atomic, not
 * fire-and-forget.
 *
 * @param {string} userID
 * @param {number} points
 * @param {string} label     - exact text shown, e.g. 'Publication approuvée : <title>'
 * @param {'badge'|'publication'|'contribution'} category
 * @param {object} [opts]
 * @param {string} [opts.sourceType] - e.g. 'KnowledgeItem', 'ValidationItem', 'Certification'
 * @param {string} [opts.sourceID]
 */
export async function awardReputation(userID, points, label, category, opts = {}) {
  const { ReputationEvents, UserProfiles } = cds.entities('aymax.knowledgehub');
  const { sourceType, sourceID } = opts;

  await INSERT.into(ReputationEvents).entries({
    ID: cds.utils.uuid(),
    user_userID: userID,
    points,
    label,
    category,
    sourceType: sourceType ?? null,
    sourceID: sourceID ?? null,
    occurredAt: new Date(),
  });

  await UPDATE(UserProfiles).set('reputation +=', points).where({ userID });
}
