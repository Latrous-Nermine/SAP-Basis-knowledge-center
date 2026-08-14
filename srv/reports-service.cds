using { aymax.knowledgehub as kh } from '../db/lot3';

/**
 * ============================================================
 *  ReportsService  —  LOT 3 (integrated from `Riadh`, app/rapports)
 * ============================================================
 *  Exposed at /odata/v4/reports
 *
 *  "Rapports" in Riadh's original tree meant two distinct things,
 *  kept distinct here: this is the KPI/department-performance
 *  dashboard ("Vue d'ensemble" - app/rapports on his branch).
 *  RapportsStageService (srv/rapports-stage-service.cds) is the
 *  separate internship-report drafting workflow ("Rapports de stage").
 *
 *  DashboardKPIs/DepartmentStats are plain seeded tables (Riadh's own
 *  note: "in production these would be CDS analytic views"), same as
 *  HR's Objectives/SkillGaps - not fed from DashboardService's real
 *  role-based providers yet, that integration is a deliberately
 *  separate follow-up (see db/lot3.cds).
 * ============================================================
 */
@path    : '/odata/v4/reports'
@requires: 'authenticated-user'
service ReportsService {

  /** Permission matrix: everyone gets READ (org-wide KPIs, nothing
      per-person to scope by OWN/TEAM here), only Administrator can
      manage the underlying numbers - "c'est pour l'admin, readonly
      pour les autres". Not @readonly anymore: that annotation blocks
      writes at the API level entirely, which would also block
      Administrator. */
  @restrict: [
    { grant: 'READ',                         to: ['Employee', 'Intern', 'Manager', 'HR', 'Administrator'] },
    { grant: ['CREATE', 'UPDATE', 'DELETE'], to: ['Administrator'] }
  ]
  entity KPIs as projection on kh.DashboardKPIs;

  @restrict: [
    { grant: 'READ',                         to: ['Employee', 'Intern', 'Manager', 'HR', 'Administrator'] },
    { grant: ['CREATE', 'UPDATE', 'DELETE'], to: ['Administrator'] }
  ]
  entity DepartmentStats as projection on kh.DepartmentStats;
}
