import cds from '@sap/cds';
import { notify } from './lib/notify.js';
import { awardReputation } from './lib/reputation.js';
import { frenchResultWord } from './lib/notifications/notification-rules.js';

/** Reputation for a Validation approval - same order of magnitude as
    Knowledge Center's own item-approval award (20), slightly lower
    since this queue's content (per db/lot3.cds) is lighter-weight than
    a full Knowledge Center article. */
const REPUTATION_VALIDATION_APPROVED = 15;

/**
 * Handler for ValidationService. getValidationCounts is Lot 3's own
 * custom logic; the before/after 'UPDATE' pair below is new (2026-08) -
 * approve/reject happens via a plain PATCH of `status` from the
 * frontend (Validation.controller.js's onApprove/onReject), not a
 * dedicated action, so there is no single call site to hook the way
 * Knowledge Center's approveItem/rejectItem action has - this pair
 * detects the pending -> approved/rejected transition around
 * whatever PATCH comes in instead.
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

    // Reads the row BEFORE the patch applies (so we know it was really
    // 'pending' - the entity's own @restrict already limits UPDATE to
    // 'pending' rows, but that's a WHERE filter, not a guarantee this
    // hook can rely on without checking itself) and stashes what the
    // 'after' hook below needs once the write has actually committed.
    this.before('UPDATE', 'ValidationItems', async (req) => {
      const id = req.data?.ID ?? req.params?.[0]?.ID;
      if (!id || (req.data.status !== 'approved' && req.data.status !== 'rejected')) return;

      const current = await SELECT.one.from(ValidationItems).where({ ID: id });
      if (current?.status !== 'pending') return;

      req._validationDecision = {
        id, title: current.title, authorID: current.author_userID, toStatus: req.data.status,
      };
    });

    this.after('UPDATE', 'ValidationItems', async (_result, req) => {
      const decision = req._validationDecision;
      if (!decision || decision.authorID === req.user.id) return;

      if (decision.toStatus === 'approved') {
        await awardReputation(
          decision.authorID, REPUTATION_VALIDATION_APPROVED,
          `Contenu validé : ${decision.title}`, 'publication',
          { sourceType: 'ValidationItem', sourceID: decision.id },
        );
      }

      notify(decision.authorID, 'VALIDATION_RESULT', {
        sourceType: 'VALIDATION', sourceId: decision.id,
        params: { title: decision.title, result: frenchResultWord(decision.toStatus) },
      });
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
