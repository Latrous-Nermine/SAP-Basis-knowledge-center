import InternProvider from '../providers/InternProvider.js';

export default class InternDashboardStrategy {

  constructor() {
    this.internProvider = new InternProvider();
  }

  async build(req) {
    const overview = await this.internProvider.getOverview(req.user.id);
    return {
      overview: overview.data,
      available: overview.available
    };
  }
}
