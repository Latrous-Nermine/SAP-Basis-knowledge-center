export default class AdminDashboardStrategy {

  constructor(repository) {
    this.repository = repository;
  }

  async build(req) {
    const allPeople = await this.repository.allPeople();
    const activeUsers = allPeople.filter((p) => p.isActive).length;

    const roleCounts = new Map();
    for (const p of allPeople) {
      const role = p.role || 'Employee';
      roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
    }

    const [postsCount, knowledgeItemsCount, roomsCount] = await Promise.all([
      this.repository.countEntity('Posts'),
      this.repository.countEntity('KnowledgeItems'),
      this.repository.countEntity('Rooms')
    ]);

    return {
      totalUsers: allPeople.length,
      activeUsers,
      // Employee/Manager/HR/Admin/Intern - fixed enum, not an
      // admin-configurable list yet, so this is a constant, not a query.
      rolesConfigured: 5,
      // No historical tracking model exists anywhere in this schema.
      activityGrowthPercent: '',
      roleDistribution: Array.from(roleCounts.entries()).map(([name, count]) => ({ name, count })),
      platformStats: {
        publications: postsCount,
        // Lot 3's Questions entity doesn't exist yet.
        questions: 0,
        knowledgeItems: knowledgeItemsCount,
        activeRooms: roomsCount
      }
    };
  }
}
