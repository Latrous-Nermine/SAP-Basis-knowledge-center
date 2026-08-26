import cds from '@sap/cds';

/**
 * "Centre de connaissances — en attente de validation" (Manager dashboard).
 * TODO-INTEGRATION.md I-02 assumed Lot 3's Validation queue didn't exist
 * yet - it does now (ValidationItems, srv/validation-service.cds), and is
 * already the exact same data KnowledgeList's own embedded "Contenu à
 * valider" section shows a Manager (ValidationSection.fragment.xml,
 * bound to the shared "validation" OData model) - not KnowledgeItems
 * itself, a deliberately separate queue (see validation-service.cds's own
 * comment). Built for real instead of an empty state, same reasoning
 * RoomProvider already established for "Activité des rooms" (2026-08).
 * Queries the table directly rather than going back through
 * ValidationService: this domain layer has no HTTP request/user session
 * to run @restrict against, so the same "pending, own department" scope
 * that rule expresses is applied explicitly here instead - via
 * author_userID IN (...), the same "people in a department" pattern
 * DashboardRepository already uses (see ManagerDashboardStrategy#build,
 * which resolves userIDs once and passes it to every provider that
 * needs it, not a department string each re-resolves on its own).
 */
export default class ValidationProvider {
  async getPendingReviews(limit, userIDs) {
    if (!userIDs || !userIDs.length) return { available: true, totalCount: 0, items: [] };

    // No .limit() here: totalCount below has to reflect the REAL number
    // pending for this department (it drives the "Validations en
    // attente" KPI tile), not just however many fit in the preview list -
    // a single department's queue is small enough that fetching it whole
    // and slicing client-side is simpler and safe, unlike e.g.
    // RoomProvider's org-wide query.
    const { ValidationItems } = cds.entities('aymax.knowledgehub');
    const allItems = await SELECT.from(ValidationItems)
      .columns('ID', 'title', 'category', 'author.displayName as authorName')
      .where({ status: 'pending', author_userID: { in: userIDs } })
      .orderBy('createdAt desc');

    return {
      available: true,
      totalCount: allItems.length,
      items: allItems.slice(0, limit).map((i) => ({
        itemID: i.ID,
        category: i.category,
        title: i.title,
        author: i.authorName || ''
      }))
    };
  }
}
