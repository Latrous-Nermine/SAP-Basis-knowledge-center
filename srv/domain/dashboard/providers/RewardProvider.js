/**
 * TODO-INTEGRATION.md I-08 - Lot 3's Rewards catalogue entity doesn't
 * exist yet. Same empty-result contract as every other provider here.
 */
export default class RewardProvider {
  async getRewards() {
    return { available: false, items: [] };
  }
}
