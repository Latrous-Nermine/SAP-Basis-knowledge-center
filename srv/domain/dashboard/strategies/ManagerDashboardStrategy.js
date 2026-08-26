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

    // teamMembers/userIDs resolved first (not folded into the Promise.all
    // below): ValidationProvider/QuestionProvider need the actual user ID
    // list, not the department name - author_userID IN (...) is this
    // codebase's own proven pattern for "people in a department" (see
    // DashboardRepository#contributionCountsForUsers/skillsForUsers),
    // not a dotted association path in .where() (tried first, silently
    // matched zero rows: CAP's plain-object query filter maps keys to
    // literal column names, it does not walk associations that way).
    const teamMembers = department ? await this.repository.peopleInDepartment(department) : [];
    const activeEmployees = teamMembers.filter((m) => m.isActive).length;
    const userIDs = teamMembers.map((m) => m.userID);

    const [topContributors, pendingReviews, questionsMonitoring, roomActivity, skills, contributionRows] = await Promise.all([
      department ? this.repository.topContributors(1, department) : Promise.resolve([]),
      this.validationProvider.getPendingReviews(3, userIDs),
      this.questionProvider.getQuestionsMonitoring(3, userIDs),
      this.roomProvider.getRoomActivity(3),
      this.repository.skillsForUsers(userIDs),
      this.repository.contributionCountsForUsers(userIDs)
    ]);

    return {
      activeEmployees,
      contributions: contributionRows.length,
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
