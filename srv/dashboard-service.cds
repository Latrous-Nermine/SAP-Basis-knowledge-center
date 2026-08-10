/**
 * ============================================================
 *  DashboardService  —  LOT 2
 * ============================================================
 *  Exposed at /odata/v4/dashboard
 *
 *  No entities: this service owns no data of its own. It is a
 *  read-only aggregation layer over data other services already
 *  own (PeopleService, KnowledgeService, FeedService) plus the
 *  small set of numbers that have no other home (team/HR/admin
 *  aggregate stats). getDashboard() takes NO role parameter -
 *  the role is derived from req.user server-side, always
 *  (docs/lot2-analysis.md §8.6; CLAUDE.md §7 rule 5).
 * ============================================================
 */
@path    : '/odata/v4/dashboard'
@requires: 'authenticated-user'
service DashboardService {

  type ActivityStat {
    label : String(60);
    value : Integer;
  }

  type EmployeeDashboard {
    totalScore        : Integer;
    badgePoints        : Integer;
    publicationPoints  : Integer;
    contributionPoints : Integer;
    activityStats       : array of ActivityStat;
  }

  type PendingReview {
    itemID   : UUID;
    category : String(30);
    title    : String(300);
    author   : String(100);
  }

  type TeamSkill {
    name      : String(100);
    headcount : Integer;
    percent   : Integer;
  }

  type QuestionStatus {
    title    : String(300);
    tagLabel : String(40);
    tagState : String(20);
  }

  type RoomActivity {
    roomID       : UUID;
    name         : String(100);
    // Raw timestamp, not pre-formatted - the frontend formats it via the
    // same relative-date formatter every other module already uses
    // (Notifications, Profile activity, Experts), not a server-side
    // locale duplicated per role.
    lastActivity : Timestamp;
    memberCount  : Integer;
  }

  type ManagerDashboard {
    activeEmployees     : Integer;
    contributions        : Integer;
    pendingValidations    : Integer;
    topContributor         : String(100);
    pendingReviews          : array of PendingReview;
    teamSkills               : array of TeamSkill;
    questionsMonitoring       : array of QuestionStatus;
    roomActivity                : array of RoomActivity;
  }

  type SkillEvolution {
    name       : String(100);
    deltaLabel : String(30);
    percent    : Integer;
  }

  type Objective {
    title    : String(300);
    tagLabel : String(40);
    tagState : String(20);
  }

  type NamedCount {
    name  : String(100);
    count : Integer;
  }

  type Reward {
    name        : String(100);
    pointsLabel : String(40);
  }

  type HRDashboard {
    totalEmployees    : Integer;
    activeEmployees     : Integer;
    averageLevel         : String(20);
    growthPercent          : String(20);
    skillsEvolution          : array of SkillEvolution;
    objectives                 : array of Objective;
    certsEarned                  : Integer;
    certsInProgress                : Integer;
    certsRecommended                 : Integer;
    topContributors                    : array of NamedCount;
    rewards                               : array of Reward;
  }

  type PlatformStats {
    publications   : Integer;
    questions      : Integer;
    knowledgeItems : Integer;
    activeRooms    : Integer;
  }

  type AdminDashboard {
    totalUsers            : Integer;
    activeUsers             : Integer;
    rolesConfigured           : Integer;
    activityGrowthPercent       : String(20);
    roleDistribution               : array of NamedCount;
    platformStats                     : PlatformStats;
  }

  type InternOverview {
    daysRemaining     : Integer;
    questionsAsked     : Integer;
    reportsSubmitted     : Integer;
    filesUploaded           : Integer;
  }

  type InternDashboard {
    overview  : InternOverview;
    available : Boolean;
  }

  type DashboardPayload {
    role     : String(20);
    employee : EmployeeDashboard;
    manager  : ManagerDashboard;
    hr       : HRDashboard;
    admin    : AdminDashboard;
    intern   : InternDashboard;
  }

  /** The single call the Dashboard page makes. No role parameter -
      see the file header. */
  function getDashboard() returns DashboardPayload;
}
