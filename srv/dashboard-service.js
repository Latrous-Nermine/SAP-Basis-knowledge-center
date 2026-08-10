import cds from '@sap/cds';
import { getDashboard } from './domain/dashboard/DashboardDomain.js';

/**
 * Thin by design, like every other Lot 2 service - the handler translates
 * the OData call into a domain call and returns the result. All branching
 * (role resolution, Strategy Pattern, provider fallbacks) lives in
 * srv/domain/dashboard/, not here.
 */
export default class DashboardService extends cds.ApplicationService {
  async init() {
    this.on('getDashboard', (req) => getDashboard(req));
    return super.init();
  }
}
