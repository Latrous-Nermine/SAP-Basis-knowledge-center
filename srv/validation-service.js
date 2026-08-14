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

    // Manager is TEAM-scoped on the entity itself (department match) -
    // this has to mirror that exactly, or the stat pills promise counts
    // (e.g. "Approuvés (1)") that the filtered list can never actually
    // show, because that row belongs to a department the caller can't
    // see. Found by comparing this against the entity's own restricted
    // read while checking the permission-matrix rollout, not assumed.
    this.on('getValidationCounts', async (req) => {
      const query = SELECT.from(ValidationItems).columns('status');
      if (req.user.is('Manager')) {
        query.where({ 'author.department': req.user.attr.department });
      }
      const rows = await query;
      const counts = { pending: 0, approved: 0, rejected: 0 };
      for (const { status } of rows) {
        if (status in counts) counts[status] += 1;
      }
      return { ...counts, total: rows.length };
    });

    return super.init();
  }
}
