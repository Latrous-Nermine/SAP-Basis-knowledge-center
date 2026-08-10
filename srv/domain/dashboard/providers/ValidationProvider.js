/**
 * TODO-INTEGRATION.md I-02 - Lot 3's Validation queue entity doesn't exist
 * yet. Well-formed empty result, never null, never a thrown error - same
 * pattern as decision C6's NoOpSecurityGuardian. Swapping in the real
 * query once Lot 3 ships Validation is a one-file change; nothing that
 * calls this needs to change shape.
 */
export default class ValidationProvider {
  async getPendingReviews(limit) {
    return { available: false, totalCount: 0, items: [] };
  }
}
