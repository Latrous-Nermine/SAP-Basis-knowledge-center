import { calculateLevel } from '../../ExpertiseLevelCalculator.js';
import RewardProvider from '../providers/RewardProvider.js';

export default class HRDashboardStrategy {

  constructor(repository) {
    this.repository = repository;
    this.rewardProvider = new RewardProvider();
  }

  async build(req) {
    const [allPeople, topContributors, certRows, rewards] = await Promise.all([
      this.repository.allPeople(),
      this.repository.topContributors(3),
      this.repository.certificationStatusCounts(),
      this.rewardProvider.getRewards()
    ]);

    const activeEmployees = allPeople.filter((p) => p.isActive).length;
    const averageReputation = allPeople.length
      ? Math.round(allPeople.reduce((sum, p) => sum + (p.reputation || 0), 0) / allPeople.length)
      : 0;

    const certCounts = { earned: 0, in_progress: 0, recommended: 0 };
    for (const c of certRows) {
      if (certCounts[c.status] !== undefined) certCounts[c.status] += 1;
    }

    return {
      totalEmployees: allPeople.length,
      activeEmployees,
      // Reuses the exact same threshold table Experts/Profile already use
      // (srv/domain/ExpertiseLevelCalculator.js) - never a second copy.
      averageLevel: calculateLevel(averageReputation),
      // No historical/quarter-over-quarter tracking model exists anywhere
      // in this schema - new TODO-INTEGRATION.md row, not a silent 0.
      growthPercent: '',
      skillsEvolution: [],
      // No Objectives entity anywhere - new TODO-INTEGRATION.md row.
      objectives: [],
      certsEarned: certCounts.earned,
      certsInProgress: certCounts.in_progress,
      certsRecommended: certCounts.recommended,
      topContributors: topContributors.map((p) => ({ name: p.displayName, count: p.reputation })),
      rewards: rewards.items
    };
  }
}
