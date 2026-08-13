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

  @readonly
  @restrict: [
    { grant: 'READ', to: ['Manager', 'HR', 'Administrator'] }
  ]
  entity KPIs as projection on kh.DashboardKPIs;

  @readonly
  @restrict: [
    { grant: 'READ', to: ['Manager', 'HR', 'Administrator'] }
  ]
  entity DepartmentStats as projection on kh.DepartmentStats;
}
