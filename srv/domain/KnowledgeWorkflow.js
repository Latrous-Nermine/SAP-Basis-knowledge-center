/**
 * The Knowledge Center status state machine. Pure functions, no `req` -
 * unit-testable without HTTP, and the one place this rule is written
 * (CLAUDE.md §10: no duplicated logic).
 *
 *   draft ──submitForReview──▶ pending ──approve──▶ approved
 *     ▲                            │
 *     └────────── reject ◀─────────┘   (→ rejected, editable again)
 *
 * Any transition not in this table must be rejected. If this check only
 * lived in the UI, a PATCH with {"status":"approved"} from Postman would
 * publish unreviewed content - bypassing the whole validation workflow.
 */
const ALLOWED_TRANSITIONS = {
  draft: ['pending'],
  pending: ['approved', 'rejected'],
  rejected: ['pending'],
  approved: [],
};

export function canTransition(fromStatus, toStatus) {
  return (ALLOWED_TRANSITIONS[fromStatus] || []).includes(toStatus);
}

export function isContributor(contributors, userID) {
  return contributors.some((c) => c.user_userID === userID);
}
