import cds from '@sap/cds';

/**
 * Handler for DepotService. The @restrict CREATE grant (depot-service.cds)
 * is role-based only - it can't express "uploadedBy must be you" as a
 * where clause, since the row doesn't exist yet at CREATE time. That
 * check belongs here instead: identity always comes from req.user.id,
 * never from what the client sent (CLAUDE.md §7 rule 2).
 */
export default class DepotService extends cds.ApplicationService {

  async init() {
    this.before('CREATE', 'DepotFiles', (req) => {
      req.data.uploadedBy_userID = req.user.id;
    });

    return super.init();
  }
}
