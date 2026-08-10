/**
 * TODO-INTEGRATION.md I-09 - internship duration, questions, submitted
 * reports and project deposits have no data model yet (Lot 3: intern
 * pages). Same empty-result contract as every other provider here.
 */
export default class InternProvider {
  async getOverview(userID) {
    return {
      available: false,
      data: { daysRemaining: 0, questionsAsked: 0, reportsSubmitted: 0, filesUploaded: 0 }
    };
  }
}
