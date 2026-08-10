import DashboardStrategyFactory from './DashboardStrategyFactory.js';

// Highest-privilege/most-specific role wins if a token ever grants more
// than one - never happens with today's mocked users (package.json),
// each has exactly one role, but a real XSUAA token could in principle
// carry several role-collections. Employee is the universal fallback.
const ROLE_PRIORITY = ['Admin', 'HR', 'DepartmentManager', 'Intern', 'Employee'];

const ROLE_KEYS = {
  Admin: 'admin',
  HR: 'hr',
  DepartmentManager: 'manager',
  Intern: 'intern',
  Employee: 'employee'
};

export function resolveRole(user) {
  return ROLE_PRIORITY.find((role) => user.is(role)) || 'Employee';
}

/**
 * getDashboard() takes no role parameter - the caller cannot request a
 * role they don't hold because there is no parameter to hand-edit. The
 * role is derived here, server-side, from req.user alone.
 */
export async function getDashboard(req) {
  const role = resolveRole(req.user);
  const strategy = DashboardStrategyFactory.forRole(role);
  const payload = await strategy.build(req);

  return { role, [ROLE_KEYS[role]]: payload };
}
