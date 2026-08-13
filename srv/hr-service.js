import cds from '@sap/cds';

/**
 * Handler for HRService. Stays thin, same convention as PeopleService
 * (srv/people-service.js) - no srv/handlers/HRHandler.js.
 */
export default class HRService extends cds.ApplicationService {

  async init() {
    const { Employees } = this.entities;
    const { UserCertifications } = cds.entities('aymax.knowledgehub');

    // ────────────────────────────────────────────────────────────
    // certsEarnedCount / certsProgressCount - one batched query per
    // page load, indexed in a Map, same pattern as PeopleService's
    // followersCount/expertiseLevel (never N+1).
    // ────────────────────────────────────────────────────────────
    this.after('READ', 'Employees', async (data) => {
      const rows = (Array.isArray(data) ? data : [data]).filter(Boolean);
      if (!rows.length) return;

      const userIDs = rows.map((r) => r.userID);
      const certRows = await SELECT.from(UserCertifications)
        .columns('user_userID', 'status')
        .where({ user_userID: { in: userIDs } });

      const earnedCounts = new Map();
      const progressCounts = new Map();
      for (const { user_userID, status } of certRows) {
        if (status === 'earned') {
          earnedCounts.set(user_userID, (earnedCounts.get(user_userID) || 0) + 1);
        } else if (status === 'in_progress') {
          progressCounts.set(user_userID, (progressCounts.get(user_userID) || 0) + 1);
        }
      }

      for (const row of rows) {
        row.certsEarnedCount = earnedCounts.get(row.userID) || 0;
        row.certsProgressCount = progressCounts.get(row.userID) || 0;
      }
    });

    return super.init();
  }
}
