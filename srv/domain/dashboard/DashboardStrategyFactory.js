import EmployeeDashboardStrategy from './strategies/EmployeeDashboardStrategy.js';
import ManagerDashboardStrategy from './strategies/ManagerDashboardStrategy.js';
import HRDashboardStrategy from './strategies/HRDashboardStrategy.js';
import AdminDashboardStrategy from './strategies/AdminDashboardStrategy.js';
import InternDashboardStrategy from './strategies/InternDashboardStrategy.js';
import DashboardRepository from './DashboardRepository.js';

const repository = new DashboardRepository();

// Adding a 6th role is one new strategy file + one new entry here - zero
// edits to any existing strategy (Open/Closed Principle).
const STRATEGIES = {
  Admin: () => new AdminDashboardStrategy(repository),
  HR: () => new HRDashboardStrategy(repository),
  DepartmentManager: () => new ManagerDashboardStrategy(repository),
  Intern: () => new InternDashboardStrategy(),
  Employee: () => new EmployeeDashboardStrategy(repository)
};

export default class DashboardStrategyFactory {
  static forRole(role) {
    const build = STRATEGIES[role] || STRATEGIES.Employee;
    return build();
  }
}
