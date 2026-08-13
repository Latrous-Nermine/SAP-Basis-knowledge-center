import cds from '@sap/cds';

/**
 * Handler for ValidationService. Only getValidationCounts needs custom
 * logic - everything else is plain @restrict-enforced CRUD, same as
 * every other Lot 3 service integrated this pass (Admin/Certifications/
 * Depot/HR/RapportsStage/Rewards have no .js file at all for the same
 * reason: nothing beyond declarative CRUD to implement).
 */
export default class ValidationService extends cds.ApplicationService {

  async init() {
    const { ValidationItems } = this.entities;

    // Identity/state come from the server, never the client - same gap,
    // same fix as DepotService/RapportsStageService's own before('CREATE')
    // hooks. Without this, author_userID and status were plain
    // client-writable fields (found while curl-testing this module).
    this.before('CREATE', 'ValidationItems', (req) => {
      req.data.author_userID = req.user.id;
      req.data.status = 'pending';
    });

    this.on('getValidationCounts', async () => {
      const rows = await SELECT.from(ValidationItems).columns('status');
      const counts = { pending: 0, approved: 0, rejected: 0 };
      for (const { status } of rows) {
        if (status in counts) counts[status] += 1;
      }
      return { ...counts, total: rows.length };
    });

    return super.init();
  }
}
