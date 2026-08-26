import cds from '@sap/cds';

/**
 * "Suivi des questions" (Manager dashboard). TODO-INTEGRATION.md I-04
 * assumed Lot 3's Questions entity didn't exist yet - it does now
 * (db/schema.cds), and is the same entity the standalone Questions app
 * (app/feed/webapp) already builds on. Built for real instead of an
 * empty state, same reasoning RoomProvider/ValidationProvider already
 * established (2026-08). Surfaces OPEN questions from the manager's own
 * department (author_userID IN (...), the same "people in a department"
 * pattern DashboardRepository already uses - see ValidationProvider's own
 * comment for why this isn't a dotted association path), unanswered ones
 * first - the ones most likely to actually need a manager's attention,
 * not just the most recent regardless of whether anyone's helped yet.
 */
export default class QuestionProvider {
  async getQuestionsMonitoring(limit, userIDs) {
    if (!userIDs || !userIDs.length) return { available: true, totalCount: 0, items: [] };

    // No .limit() on the query itself: totalCount below should reflect
    // every open question for this department, not just however many
    // fit in the preview list (nothing reads totalCount today, but
    // ValidationProvider's identical field does drive a KPI tile - kept
    // correct here too rather than silently capped, for the same reason).
    const { Questions } = cds.entities('aymax.knowledgehub');
    const allQuestions = await SELECT.from(Questions)
      .columns('ID', 'title', 'answerCount')
      .where({ status: 'open', author_userID: { in: userIDs } })
      .orderBy('answerCount asc', 'createdAt desc');

    return {
      available: true,
      totalCount: allQuestions.length,
      items: allQuestions.slice(0, limit).map((q) => {
        const iAnswers = Number(q.answerCount) || 0;
        return {
          questionID: q.ID,
          title: q.title,
          tagLabel: iAnswers > 0 ? iAnswers + ' réponse(s)' : 'Sans réponse',
          tagState: iAnswers > 0 ? 'Success' : 'Warning'
        };
      })
    };
  }
}
