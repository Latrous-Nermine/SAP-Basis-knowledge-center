import cds from '@sap/cds';
import ValidationProvider from '../providers/ValidationProvider.js';
import QuestionProvider from '../providers/QuestionProvider.js';
import RoomProvider from '../providers/RoomProvider.js';

export default class ManagerDashboardStrategy {

  constructor(repository) {
    this.repository = repository;
    this.validationProvider = new ValidationProvider();
    this.questionProvider = new QuestionProvider();
    this.roomProvider = new RoomProvider();
  }

  async build(req) {
    const { UserProfiles } = cds.entities('aymax.knowledgehub');
    const manager = await SELECT.one.from(UserProfiles).columns('department').where({ userID: req.user.id });
    const department = manager && manager.department;

    const [teamMembers, topContributors, pendingReviews, questionsMonitoring, roomActivity] = await Promise.all([
      department ? this.repository.peopleInDepartment(department) : Promise.resolve([]),
      department ? this.repository.topContributors(1, department) : Promise.resolve([]),
      this.validationProvider.getPendingReviews(3),
      this.questionProvider.getQuestionsMonitoring(3),
      this.roomProvider.getRoomActivity(3)
    ]);

    const activeEmployees = teamMembers.filter((m) => m.isActive).length;
    const userIDs = teamMembers.map((m) => m.userID);

    const [skills, contributionRows] = await Promise.all([
      this.repository.skillsForUsers(userIDs),
      this.repository.contributionCountsForUsers(userIDs)
    ]);

    return {
      activeEmployees,
      contributions: contributionRows.length,
      // Preview-list count, not a true total - ValidationProvider is a
      // stub (TODO-INTEGRATION.md I-02) until Lot 3's queue exists.
      pendingValidations: pendingReviews.totalCount,
      topContributor: (topContributors[0] && topContributors[0].displayName) || '',
      pendingReviews: pendingReviews.items,
      teamSkills: this._aggregateSkills(skills, userIDs.length),
      questionsMonitoring: questionsMonitoring.items,
      roomActivity: roomActivity.items
    };
  }

  _aggregateSkills(skills, teamSize) {
    const byName = new Map();
    for (const s of skills) {
      const entry = byName.get(s.skillName) || { name: s.skillName, headcount: 0 };
      entry.headcount += 1;
      byName.set(s.skillName, entry);
    }
    return Array.from(byName.values())
      .sort((a, b) => b.headcount - a.headcount)
      .slice(0, 5)
      .map((e) => ({ ...e, percent: teamSize ? Math.round((e.headcount / teamSize) * 100) : 0 }));
  }
}
