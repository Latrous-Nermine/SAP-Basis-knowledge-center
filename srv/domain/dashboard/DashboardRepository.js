import cds from '@sap/cds';

/**
 * Raw queries genuinely shared by 2+ dashboard strategies (People-by-
 * department, People-by-role, top-N-by-reputation, generic entity counts).
 * This is the one place Dashboard deviates from this codebase's usual
 * "no repository layer" convention (see Phase 3) - everywhere else keeps
 * queries inline in the service file because nothing else needs them;
 * these specific ones would otherwise be copy-pasted across strategies.
 */
export default class DashboardRepository {

  async peopleInDepartment(department) {
    const { UserProfiles } = cds.entities('aymax.knowledgehub');
    return SELECT.from(UserProfiles).where({ department });
  }

  async allPeople() {
    const { UserProfiles } = cds.entities('aymax.knowledgehub');
    return SELECT.from(UserProfiles);
  }

  async topContributors(limit, department) {
    const { UserProfiles } = cds.entities('aymax.knowledgehub');
    const query = SELECT.from(UserProfiles).orderBy('reputation desc').limit(limit);
    return department ? query.where({ department }) : query;
  }

  async skillsForUsers(userIDs) {
    const { UserSkills } = cds.entities('aymax.knowledgehub');
    if (!userIDs.length) return [];
    return SELECT.from(UserSkills).where({ user_userID: { in: userIDs } });
  }

  async contributionCountsForUsers(userIDs) {
    const { KnowledgeContributors } = cds.entities('aymax.knowledgehub');
    if (!userIDs.length) return [];
    return SELECT.from(KnowledgeContributors).columns('user_userID').where({ user_userID: { in: userIDs } });
  }

  async certificationStatusCounts() {
    const { UserCertifications } = cds.entities('aymax.knowledgehub');
    return SELECT.from(UserCertifications).columns('status');
  }

  // Platform-wide totals for Admin/HR aggregate counters. Deliberately a
  // raw count against the shared entity, not routed through the owning
  // service's own OData projection: KnowledgeService's @restrict has no
  // Admin bypass (it filters to "approved or own" for every caller), so
  // going through it would undercount for the one role that actually
  // needs a true total. Only a number crosses the wire, never rows, so
  // this doesn't leak anything the row-level restriction protects.
  async countEntity(entityName) {
    const entity = cds.entities('aymax.knowledgehub')[entityName];
    const rows = await SELECT.from(entity).columns('ID');
    return rows.length;
  }
}
