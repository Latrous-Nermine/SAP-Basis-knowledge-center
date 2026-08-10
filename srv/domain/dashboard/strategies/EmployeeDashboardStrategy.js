import cds from '@sap/cds';

/**
 * KPIs reuse PeopleService's own getScoreBreakdown() in-process (never a
 * duplicated query) - Employee's dashboard is "Profile's KPI row again",
 * not a second computation of the same numbers.
 */
export default class EmployeeDashboardStrategy {

  async build(req) {
    const userID = req.user.id;
    const people = await cds.connect.to('PeopleService');

    const [scoreBreakdown, publications, comments, profile] = await Promise.all([
      people.tx(req).send('getScoreBreakdown', { userID }),
      this._countPublications(userID),
      this._countComments(userID),
      this._getReputation(userID)
    ]);

    return {
      totalScore: profile,
      badgePoints: scoreBreakdown.badges,
      publicationPoints: scoreBreakdown.publications,
      contributionPoints: scoreBreakdown.contributions,
      activityStats: [
        { label: 'Publications', value: publications },
        // Questions posées / Réponses / Réponses acceptées all depend on
        // Lot 3's Questions entity, which doesn't exist yet (I-04-adjacent).
        { label: 'Questions posées', value: 0 },
        { label: 'Réponses', value: 0 },
        { label: 'Réponses acceptées', value: 0 },
        { label: 'Commentaires', value: comments }
      ]
    };
  }

  async _countPublications(userID) {
    const { KnowledgeContributors } = cds.entities('aymax.knowledgehub');
    const rows = await SELECT.from(KnowledgeContributors).columns('ID').where({ user_userID: userID });
    return rows.length;
  }

  async _countComments(userID) {
    const { Comments } = cds.entities('aymax.knowledgehub');
    const rows = await SELECT.from(Comments).columns('ID').where({ author_userID: userID });
    return rows.length;
  }

  async _getReputation(userID) {
    const { UserProfiles } = cds.entities('aymax.knowledgehub');
    const row = await SELECT.one.from(UserProfiles).columns('reputation').where({ userID });
    return (row && row.reputation) || 0;
  }
}
