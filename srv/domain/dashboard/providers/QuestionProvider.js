/**
 * TODO-INTEGRATION.md I-04 - Lot 3's Questions entity doesn't exist yet.
 * Same empty-result contract as every other provider in this folder.
 */
export default class QuestionProvider {
  async getQuestionsMonitoring(limit) {
    return { available: false, totalCount: 0, items: [] };
  }
}
