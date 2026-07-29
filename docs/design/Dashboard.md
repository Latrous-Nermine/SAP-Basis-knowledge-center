# Design reference — Dashboard

> **Tableau de bord — 5 variantes de rôle**
>
> Extracted from the Claude Design export (`AYMAX_Knowledge_Hub_Design.zip`).
> This is the **authoritative source for UI structure, labels and business rules**
> (see decision C2). It is a web prototype, not SAP Fiori — map every element to a
> Fiori control per `docs/lot2-analysis.md` §9. Do not reproduce the raw CSS.
>
> Templating syntax: `{{ x }}` = binding, `<sc-for list="{{ xs }}" as="x">` = repeat,
> `<sc-if value="{{ cond }}">` = conditional. CSS and SVG icons have been stripped.

## 1. Markup / layout

```html
<div style="min-height:100vh;background:var(--color-bg);color:var(--color-text);font-family:var(--font-body)" data-theme="{{ theme }}">
  <header class="nav" style="position:sticky;top:0;z-index:40;background:var(--color-bg);border-bottom:1px solid var(--color-divider);padding-left:24px;padding-right:24px">
    <div class="nav-brand" style="display:flex;align-items:center;gap:10px">
      <div style="width:32px;height:32px;background:var(--color-accent);color:var(--color-bg);display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:700;font-size:16px;flex:none">A</div>
      <div style="display:flex;flex-direction:column;line-height:1.1">
        <span style="font-size:17px">AYMAX</span>
        <span style="font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--color-accent);font-family:var(--font-body)">knowledge hub</span>
      </div>
    </div>
    <nav class="feed-nav-links">
      <a href="AYMAX Knowledge Hub - Dashboard.dc.html" aria-current="page">Tableau de bord</a>
      <a href="AYMAX Knowledge Hub - Feed.dc.html">Fil d'actualité</a>
      <a href="AYMAX Knowledge Hub - Questions.dc.html">Questions</a>
      <a href="AYMAX Knowledge Hub - Knowledge Center.dc.html">Centre de connaissances</a>
      <a href="AYMAX Knowledge Hub - Rooms.dc.html">Rooms</a>
      <a href="AYMAX Knowledge Hub - Tags.dc.html">Tags</a>
      <a href="AYMAX Knowledge Hub - Experts.dc.html">Experts</a>
      <a href="AYMAX Knowledge Hub - Profile.dc.html">Profil</a>
    </nav>
    <div style="position:relative;flex:none;margin-left:8px">
      <button class="btn btn-secondary" sc-camel-on-click="{{ toggleDashboardMenu }}" style="font-size:12.5px;gap:6px">
        {{ dashboardLabel }}
        <!-- icon -->
      </button>
      <sc-if value="{{ dashboardMenuOpen }}" hint-placeholder-val="{{ false }}">
        <div class="card elev-lg" style="position:absolute;top:40px;left:0;width:220px;padding:6px;background:var(--color-bg);z-index:60">
          <sc-for list="{{ dashboardOptions }}" as="d" hint-placeholder-count="4">
            <button class="btn btn-ghost" style="width:100%;justify-content:flex-start;font-weight:{{ d.weight }}" sc-camel-on-click="{{ d.onClick }}">{{ d.label }}</button>
          </sc-for>
        </div>
      </sc-if>
    </div>
    <div style="flex:1"></div>
    <div style="display:flex;align-items:center;gap:8px;flex:none">
      <button class="btn btn-icon btn-secondary" sc-camel-on-click="{{ toggleTheme }}" title="Changer de thème">
        <sc-if value="{{ isDark }}" hint-placeholder-val="{{ false }}"><!-- icon --></sc-if>
        <sc-if value="{{ isLight }}" hint-placeholder-val="{{ true }}"><!-- icon --></sc-if>
      </button>
      <a href="AYMAX Knowledge Hub - Profile.dc.html" style="text-decoration:none">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--color-accent-700);color:var(--color-bg);display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:600;font-size:13px">{{ userInitials }}</div>
      </a>
    </div>
  </header>
  <div style="max-width:1400px;margin:0 auto;padding:24px 24px 80px;display:flex;flex-direction:column;gap:20px">
    <div>
      <div style="font-family:var(--font-heading);font-weight:700;font-size:26px">{{ dashboardTitle }}</div>
      <div style="font-size:13.5px;opacity:.7;margin-top:2px">{{ dashboardSubtitle }}</div>
    </div>
    <!-- ============ EMPLOYEE ============ -->
    <sc-if value="{{ isEmployee }}" hint-placeholder-val="{{ true }}">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
        <div class="card elev-sm" style="padding:18px;background:linear-gradient(135deg, var(--color-primary), var(--color-secondary));border:none;color:#fff">
          <div class="card-kicker" style="color:rgba(255,255,255,.75)">Score total</div>
          <div style="font-family:var(--font-heading);font-weight:700;font-size:26px">{{ emp.totalScore }} pts</div>
        </div>
        <div class="card elev-sm" style="padding:18px"><div class="card-kicker">Badges</div><div style="font-family:var(--font-heading);font-weight:700;font-size:22px">{{ emp.badgePoints }} pts</div></div>
        <div class="card elev-sm" style="padding:18px"><div class="card-kicker">Publications</div><div style="font-family:var(--font-heading);font-weight:700;font-size:22px">{{ emp.publicationPoints }} pts</div></div>
        <div class="card elev-sm" style="padding:18px"><div class="card-kicker">Contributions</div><div style="font-family:var(--font-heading);font-weight:700;font-size:22px">{{ emp.contributionPoints }} pts</div></div>
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
        <div class="card elev-sm" style="padding:18px;gap:12px">
          <div class="card-kicker">Activité de connaissance</div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:4px">
            <sc-for list="{{ emp.activityStats }}" as="a" hint-placeholder-count="5">
              <div style="text-align:center">
                <div style="font-family:var(--font-heading);font-weight:700;font-size:20px">{{ a.value }}</div>
                <div style="font-size:10.5px;opacity:.6">{{ a.label }}</div>
              </div>
            </sc-for>
          </div>
        </div>
        <button class="btn btn-secondary" sc-camel-on-click="{{ openTimeline }}" style="align-self:center;justify-self:center">Voir la timeline</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card elev-sm" style="padding:18px;gap:10px">
          <div class="card-kicker">Compétences</div>
          <sc-for list="{{ emp.skills }}" as="sk" hint-placeholder-count="4">
            <div style="padding:5px 0">
              <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px"><span>{{ sk.name }}</span><span style="color:var(--color-accent)">{{ sk.stars }}</span></div>
              <div style="height:5px;background:var(--color-neutral-200);border-radius:999px"><div style="height:100%;border-radius:999px;background:var(--color-accent);width:{{ sk.percent }}"></div></div>
            </div>
          </sc-for>
        </div>
        <div class="card elev-sm" style="padding:18px;gap:10px">
          <div class="card-kicker">Certifications</div>
          <div style="font-size:12px;font-weight:700;color:var(--color-success);margin-top:2px">Obtenues</div>
          <sc-for list="{{ emp.certsEarned }}" as="c" hint-placeholder-count="2"><div style="font-size:13px;padding:4px 0;border-top:1px solid var(--color-divider)">{{ c }}</div></sc-for>
          <div style="font-size:12px;font-weight:700;margin-top:8px">En cours</div>
          <sc-for list="{{ emp.certsProgress }}" as="c" hint-placeholder-count="2"><div style="font-size:13px;padding:4px 0;border-top:1px solid var(--color-divider)">{{ c }}</div></sc-for>
          <div style="font-size:12px;font-weight:700;margin-top:8px">Recommandées</div>
          <sc-for list="{{ emp.certsRecommended }}" as="c" hint-placeholder-count="2"><div style="font-size:13px;padding:4px 0;border-top:1px solid var(--color-divider)">{{ c }}</div></sc-for>
        </div>
      </div>
    </sc-if>
    <!-- ============ MANAGER ============ -->
    <sc-if value="{{ isManager }}" hint-placeholder-val="{{ false }}">
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:16px">
        <sc-for list="{{ mgr.teamOverview }}" as="k" hint-placeholder-count="5">
          <div class="card elev-sm" style="padding:16px">
            <div class="card-kicker">{{ k.label }}</div>
            <div style="font-family:var(--font-heading);font-weight:700;font-size:22px">{{ k.value }}</div>
          </div>
        </sc-for>
      </div>
      <div class="card elev-sm" style="padding:18px;gap:12px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div class="card-kicker">Centre de connaissances — en attente de validation</div>
          <a href="AYMAX Knowledge Hub - Validation.dc.html" style="font-size:12px">Voir tout →</a>
        </div>
        <sc-for list="{{ mgr.pendingReviews }}" as="p" hint-placeholder-count="3">
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--color-divider)">
            <span class="tag tag-outline">{{ p.category }}</span>
            <div style="flex:1;min-width:0;font-size:13.5px;font-weight:600">{{ p.title }}</div>
            <span style="font-size:11.5px;opacity:.6">{{ p.author }}</span>
            <button class="btn btn-secondary" style="font-size:11.5px;padding:6px 10px">Rejeter</button>
            <button class="btn btn-primary" style="font-size:11.5px;padding:6px 10px">Approuver</button>
          </div>
        </sc-for>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card elev-sm" style="padding:18px;gap:10px">
          <div class="card-kicker">Expertise de l'équipe</div>
          <sc-for list="{{ mgr.teamSkills }}" as="sk" hint-placeholder-count="4">
            <div style="padding:5px 0">
              <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px"><span>{{ sk.name }}</span><span style="opacity:.6">{{ sk.headcount }} experts</span></div>
              <div style="height:5px;background:var(--color-neutral-200);border-radius:999px"><div style="height:100%;border-radius:999px;background:var(--color-accent);width:{{ sk.percentLabel }}"></div></div>
            </div>
          </sc-for>
        </div>
        <div class="card elev-sm" style="padding:18px;gap:10px">
          <div class="card-kicker">Suivi des questions</div>
          <sc-for list="{{ mgr.questionsMonitoring }}" as="q" hint-placeholder-count="3">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid var(--color-divider)">
              <span style="font-size:13px">{{ q.title }}</span>
              <span class="tag {{ q.tagClass }}">{{ q.tagLabel }}</span>
            </div>
          </sc-for>
        </div>
      </div>
      <div class="card elev-sm" style="padding:18px;gap:10px">
        <div class="card-kicker">Activité des rooms</div>
        <sc-for list="{{ mgr.roomActivity }}" as="r" hint-placeholder-count="3">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid var(--color-divider)">
            <div><div style="font-size:13.5px;font-weight:600">{{ r.name }}</div><div style="font-size:11.5px;opacity:.6">{{ r.lastActivity }}</div></div>
            <span style="font-size:11.5px;opacity:.6">{{ r.memberCount }} membres</span>
          </div>
        </sc-for>
      </div>
    </sc-if>
    <!-- ============ HR ============ -->
    <sc-if value="{{ isHR }}" hint-placeholder-val="{{ false }}">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
        <sc-for list="{{ hr.overview }}" as="k" hint-placeholder-count="4">
          <div class="card elev-sm" style="padding:16px">
            <div class="card-kicker">{{ k.label }}</div>
            <div style="font-family:var(--font-heading);font-weight:700;font-size:22px">{{ k.value }}</div>
          </div>
        </sc-for>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card elev-sm" style="padding:18px;gap:10px">
          <div class="card-kicker">Évolution des compétences</div>
          <sc-for list="{{ hr.skillsEvolution }}" as="sk" hint-placeholder-count="4">
            <div style="padding:5px 0">
              <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px"><span>{{ sk.name }}</span><span style="opacity:.6">{{ sk.deltaLabel }}</span></div>
              <div style="height:5px;background:var(--color-neutral-200);border-radius:999px"><div style="height:100%;border-radius:999px;background:var(--color-accent);width:{{ sk.percentLabel }}"></div></div>
            </div>
          </sc-for>
        </div>
        <div class="card elev-sm" style="padding:18px;gap:10px">
          <div class="card-kicker">Objectifs</div>
          <sc-for list="{{ hr.objectives }}" as="o" hint-placeholder-count="3">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid var(--color-divider)">
              <span style="font-size:13px">{{ o.title }}</span>
              <span class="tag {{ o.tagClass }}">{{ o.tagLabel }}</span>
            </div>
          </sc-for>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card elev-sm" style="padding:18px;gap:10px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div class="card-kicker">Certifications</div>
          </div>
          <div style="font-size:12px;font-weight:700;color:var(--color-success)">{{ hr.certsEarned }} obtenues</div>
          <div style="font-size:12px;font-weight:700">{{ hr.certsProgress }} en cours</div>
          <div style="font-size:12px;font-weight:700;opacity:.7">{{ hr.certsRecommended }} recommandées</div>
        </div>
        <div class="card elev-sm" style="padding:18px;gap:10px">
          <div class="card-kicker">Top contributeurs</div>
          <sc-for list="{{ hr.topContributors }}" as="c" hint-placeholder-count="3">
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid var(--color-divider)"><span style="font-size:13px;font-weight:600">{{ c.name }}</span><span style="font-size:12px;opacity:.65">{{ c.points }} pts</span></div>
          </sc-for>
        </div>
      </div>
      <div class="card elev-sm" style="padding:18px;gap:10px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div class="card-kicker">Catalogue de récompenses</div>
          <a href="AYMAX Knowledge Hub - Rewards.dc.html" style="font-size:12px">Gérer →</a>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <sc-for list="{{ hr.rewards }}" as="r" hint-placeholder-count="3">
            <span class="tag tag-accent">{{ r.name }} — {{ r.pointsLabel }}</span>
          </sc-for>
        </div>
      </div>
    </sc-if>
    <!-- ============ INTERN ============ -->
    <sc-if value="{{ isIntern }}" hint-placeholder-val="{{ false }}">
      <div class="card elev-sm" style="padding:14px 18px;gap:6px;border-color:var(--color-accent);flex-direction:row;align-items:center;background:color-mix(in srgb, var(--color-accent) 8%, transparent)">
        <!-- icon -->
        <div style="font-size:12.5px">Accès stagiaire : consultation, questions/réponses et Room Stage uniquement. La publication d'articles, de documentation et la validation de contenu ne sont pas accessibles.</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
        <sc-for list="{{ intern.overview }}" as="k" hint-placeholder-count="4">
          <div class="card elev-sm" style="padding:16px">
            <div class="card-kicker">{{ k.label }}</div>
            <div style="font-family:var(--font-heading);font-weight:700;font-size:22px">{{ k.value }}</div>
          </div>
        </sc-for>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
        <a href="AYMAX Knowledge Hub - Feed.dc.html" class="card elev-sm" style="padding:18px;gap:6px;text-decoration:none;color:var(--color-text)">
          <div class="card-title" style="font-size:15px">Fil d'actualité</div>
          <div class="card-body" style="font-size:12.5px">Consulter et publier des posts simples.</div>
        </a>
        <a href="AYMAX Knowledge Hub - Room Stage.dc.html" class="card elev-sm" style="padding:18px;gap:6px;text-decoration:none;color:var(--color-text)">
          <div class="card-title" style="font-size:15px">Room Stage</div>
          <div class="card-body" style="font-size:12.5px">Discussions, fichiers et annonces de votre stage.</div>
        </a>
        <a href="AYMAX Knowledge Hub - Rapports de Stage.dc.html" class="card elev-sm" style="padding:18px;gap:6px;text-decoration:none;color:var(--color-text)">
          <div class="card-title" style="font-size:15px">Rapports de stage</div>
          <div class="card-body" style="font-size:12.5px">Créer, modifier et soumettre vos rapports.</div>
        </a>
        <a href="AYMAX Knowledge Hub - Depot de Projet.dc.html" class="card elev-sm" style="padding:18px;gap:6px;text-decoration:none;color:var(--color-text)">
          <div class="card-title" style="font-size:15px">Dépôt de projet</div>
          <div class="card-body" style="font-size:12.5px">Déposer les fichiers et la documentation du projet.</div>
        </a>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card elev-sm" style="padding:18px;gap:10px">
          <div class="card-kicker">Mes questions récentes</div>
          <sc-for list="{{ intern.questions }}" as="q" hint-placeholder-count="3">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid var(--color-divider)">
              <span style="font-size:13px">{{ q.title }}</span>
              <span class="tag {{ q.tagClass }}">{{ q.tagLabel }}</span>
            </div>
          </sc-for>
        </div>
        <div class="card elev-sm" style="padding:18px;gap:10px">
          <div class="card-kicker">Rapport de stage</div>
          <sc-for list="{{ intern.reports }}" as="r" hint-placeholder-count="1">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid var(--color-divider)">
              <span style="font-size:13px">{{ r.title }}</span>
              <span class="tag {{ r.tagClass }}">{{ r.tagLabel }}</span>
            </div>
          </sc-for>
        </div>
      </div>
    </sc-if>
    <!-- ============ ADMIN ============ -->
    <sc-if value="{{ isAdmin }}" hint-placeholder-val="{{ false }}">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
        <sc-for list="{{ admin.stats }}" as="k" hint-placeholder-count="4">
          <div class="card elev-sm" style="padding:16px">
            <div class="card-kicker">{{ k.label }}</div>
            <div style="font-family:var(--font-heading);font-weight:700;font-size:22px">{{ k.value }}</div>
          </div>
        </sc-for>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
        <a href="AYMAX Knowledge Hub - Experts.dc.html" class="card elev-sm" style="padding:18px;gap:6px;text-decoration:none;color:var(--color-text)">
          <div class="card-title" style="font-size:15px">Utilisateurs</div>
          <div class="card-body" style="font-size:12.5px">Gérer les comptes et l'activité des utilisateurs.</div>
        </a>
        <a href="AYMAX Knowledge Hub - Admin.dc.html" class="card elev-sm" style="padding:18px;gap:6px;text-decoration:none;color:var(--color-text)">
          <div class="card-title" style="font-size:15px">Rôles</div>
          <div class="card-body" style="font-size:12.5px">Distribution des rôles sur la plateforme.</div>
        </a>
        <a href="AYMAX Knowledge Hub - Admin.dc.html" class="card elev-sm" style="padding:18px;gap:6px;text-decoration:none;color:var(--color-text)">
          <div class="card-title" style="font-size:15px">Permissions</div>
          <div class="card-body" style="font-size:12.5px">Contrôle d'accès par rôle.</div>
        </a>
        <a href="AYMAX Knowledge Hub - Admin.dc.html" class="card elev-sm" style="padding:18px;gap:6px;text-decoration:none;color:var(--color-text)">
          <div class="card-title" style="font-size:15px">Paramètres système</div>
          <div class="card-body" style="font-size:12.5px">Configuration globale de l'application.</div>
        </a>
      </div>
      <div class="card elev-sm" style="padding:18px;gap:10px">
        <div class="card-kicker">Statistiques de la plateforme</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:4px">
          <sc-for list="{{ admin.platformStats }}" as="p" hint-placeholder-count="4">
            <div style="text-align:center"><div style="font-family:var(--font-heading);font-weight:700;font-size:20px">{{ p.value }}</div><div style="font-size:10.5px;opacity:.6">{{ p.label }}</div></div>
          </sc-for>
        </div>
      </div>
    </sc-if>
  </div>
  <sc-if value="{{ timelineOpen }}" hint-placeholder-val="{{ false }}">
    <div class="dialog-backdrop" style="z-index:80" sc-camel-on-click="{{ closeTimeline }}">
      <div class="dialog" style="width:min(520px,100%);padding:20px;gap:14px" sc-camel-on-click="{{ stopProp }}">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div class="dialog-title">Timeline de contribution</div>
          <button class="btn btn-icon btn-ghost" sc-camel-on-click="{{ closeTimeline }}">
            <!-- icon -->
          </button>
        </div>
        <div style="max-height:60vh;overflow:auto;display:flex;flex-direction:column;gap:16px">
          <sc-for list="{{ emp.timelineMonths }}" as="m" hint-placeholder-count="2">
            <div>
              <div class="card-kicker" style="margin-bottom:8px">{{ m.label }}</div>
              <sc-for list="{{ m.entries }}" as="e" hint-placeholder-count="3">
                <div style="display:flex;gap:10px;align-items:baseline;padding:6px 0;border-top:1px solid var(--color-divider)">
                  <span style="font-family:var(--font-heading);font-weight:700;font-size:13px;color:var(--color-success);min-width:48px">+{{ e.points }}</span>
                  <span style="font-size:13px">{{ e.label }}</span>
                </div>
              </sc-for>
            </div>
          </sc-for>
        </div>
      </div>
    </div>
  </sc-if>
</div>
```

## 2. State, mock data and client logic

The `state` object below is the **data contract** the UI expects. Use it to shape
your CDS entities and your OData payloads, and reuse the values as CSV seed data.

```js
const DASHBOARD_OPTIONS = [
  { id: 'employee', label: 'Tableau de bord Employé' },
  { id: 'manager', label: 'Tableau de bord Manager' },
  { id: 'hr', label: 'Tableau de bord RH' },
  { id: 'admin', label: 'Tableau de bord Administrateur' },
  { id: 'intern', label: 'Tableau de bord Stagiaire' },
];
const TITLES = {
  employee: { title: 'Tableau de bord Employé', subtitle: 'Votre contribution, votre progression professionnelle.', initials: 'SB' },
  manager: { title: 'Tableau de bord Manager', subtitle: "Activité de l'équipe et gouvernance de la connaissance.", initials: 'MJ' },
  hr: { title: 'Tableau de bord RH', subtitle: 'Développement des employés et analytique RH.', initials: 'RH' },
  admin: { title: 'Tableau de bord Administrateur', subtitle: 'Administration technique de la plateforme.', initials: 'AD' },
  intern: { title: 'Tableau de bord Stagiaire', subtitle: 'Espace stage — accès limité aux fonctionnalités essentielles.', initials: 'YM' },
};

class Component extends DCLogic {
  state = {
    theme: 'light',
    dashboard: (typeof localStorage !== 'undefined' && localStorage.getItem('aymax_dashboard')) || 'employee',
    dashboardMenuOpen: false,
    timelineOpen: false,
    emp: {
      totalScore: 1200, badgePoints: 400, publicationPoints: 480, contributionPoints: 320,
      activityStats: [
        { label: 'Publications', value: 18 }, { label: 'Questions posées', value: 6 },
        { label: 'Réponses', value: 24 }, { label: 'Réponses acceptées', value: 11 }, { label: 'Commentaires', value: 37 },
      ],
      skills: [
        { name: 'SAP BTP', stars: '★★★★★', percent: '92%' },
        { name: 'Java / Spring Boot', stars: '★★★★☆', percent: '80%' },
        { name: 'SAP Fiori', stars: '★★★★☆', percent: '78%' },
        { name: 'Docker', stars: '★★★☆☆', percent: '55%' },
      ],
      certsEarned: ['SAP BTP Associate', 'SAP Fiori Elements Developer'],
      certsProgress: ['Cloud Foundry Advanced (30%)', 'SAP HANA Cloud Specialist (65%)'],
      certsRecommended: ['Spring Boot Professional', 'SAP Integration Suite'],
      timelineMonths: [
        { label: 'Juillet 2026', entries: [{ points: 50, label: 'Publication approuvée' }, { points: 25, label: 'Réponse acceptée' }, { points: 100, label: 'Documentation validée' }] },
        { label: 'Juin 2026', entries: [{ points: 30, label: 'Commentaire utile' }, { points: 75, label: 'Article publié' }] },
      ],
    },
    mgr: {
      teamOverview: [
        { label: 'Employés actifs', value: 42 }, { label: 'Activité équipe', value: '+18%' },
        { label: 'Contributions', value: 96 }, { label: 'Validations en attente', value: 3 }, { label: 'Top contributeur', value: 'N. Ferchichi' },
      ],
      pendingReviews: [
        { category: 'Documentation', title: 'Guide de paramétrage des vues CDS pour la migration HANA Cloud', author: 'Nadia Ferchichi' },
        { category: 'Bonnes pratiques', title: 'Réduire le poids des images Docker de build en pipeline CI/CD', author: 'Karim Trabelsi' },
        { category: 'Rapport de stage', title: 'Rapport de fin de stage — intégration API Portail Client', author: 'Yassine Gharbi' },
      ],
      teamSkills: [
        { name: 'SAP BTP', headcount: 6, percentLabel: '78%' },
        { name: 'Java / Spring Boot', headcount: 4, percentLabel: '64%' },
        { name: 'Cloud Foundry', headcount: 3, percentLabel: '52%' },
      ],
      questionsMonitoring: [
        { title: 'Docker : image de build CI/CD trop volumineuse', tagLabel: 'Sans réponse', tagClass: 'tag-warning' },
        { title: 'Meilleure approche OData V4 pagination', tagLabel: 'Tendance', tagClass: 'tag-info' },
        { title: 'Erreur de déploiement CAP sur Cloud Foundry', tagLabel: 'Résolue', tagClass: 'tag-success' },
      ],
      roomActivity: [
        { name: 'Migration HANA Cloud', lastActivity: 'Dernière activité il y a 2 h', memberCount: 12 },
        { name: 'Plateforme Portail Client', lastActivity: 'Dernière activité hier', memberCount: 8 },
      ],
    },
    hr: {
      overview: [
        { label: 'Employés au total', value: 178 }, { label: 'Employés actifs', value: 156 },
        { label: 'Niveau moyen', value: 'Contributeur' }, { label: 'Croissance des compétences', value: '+12%' },
      ],
      skillsEvolution: [
        { name: 'SAP BTP', deltaLabel: '+9% ce trimestre', percentLabel: '78%' },
        { name: 'Java / Spring Boot', deltaLabel: '+5% ce trimestre', percentLabel: '64%' },
        { name: 'Cloud Foundry', deltaLabel: '+14% ce trimestre', percentLabel: '52%' },
      ],
      objectives: [
        { title: 'Certifier 3 consultants SAP BTP Associate', tagLabel: 'En bonne voie', tagClass: 'tag-success' },
        { title: 'Réduire le délai de résolution à 24h', tagLabel: 'À risque', tagClass: 'tag-warning' },
        { title: 'Publier 5 bonnes pratiques CI/CD', tagLabel: 'Atteint', tagClass: 'tag-completed' },
      ],
      certsEarned: 64, certsProgress: 23, certsRecommended: 41,
      topContributors: [
        { name: 'Nadia Ferchichi', points: 2140 }, { name: 'Karim Trabelsi', points: 1875 }, { name: 'Ines Chaabane', points: 1520 },
      ],
      rewards: [
        { name: 'Sac ordinateur', points: 5000 }, { name: 'Ordinateur portable', points: 10000 }, { name: 'Smartphone', points: 20000 },
      ],
    },
    admin: {
      stats: [
        { label: 'Utilisateurs totaux', value: 178 }, { label: 'Utilisateurs actifs', value: 156 },
        { label: 'Rôles configurés', value: 5 }, { label: 'Activité plateforme', value: '+9%' },
      ],
      platformStats: [
        { label: 'Publications', value: '1 240' }, { label: 'Questions', value: 386 },
        { label: 'Contenu (Centre de connaissances)', value: 214 }, { label: 'Rooms actives', value: 18 },
      ],
    },
    intern: {
      overview: [
        { label: 'Jours de stage restants', value: 42 }, { label: 'Questions posées', value: 5 },
        { label: 'Rapports soumis', value: 1 }, { label: 'Fichiers déposés', value: 8 },
      ],
      questions: [
        { title: 'Comment configurer l\u2019environnement de développement local ?', tagLabel: 'Répondue', tagClass: 'tag-success' },
        { title: 'Convention de nommage des branches Git sur le projet Atlas', tagLabel: 'En attente', tagClass: 'tag-warning' },
      ],
      reports: [
        { title: 'Rapport de stage — Migration HANA Cloud', tagLabel: 'Soumis', tagClass: 'tag-pending' },
      ],
    },
  };

  toggleTheme = () => this.setState(s => ({ theme: s.theme === 'light' ? 'dark' : 'light' }));
  toggleDashboardMenu = () => this.setState(s => ({ dashboardMenuOpen: !s.dashboardMenuOpen }));
  setDashboard = id => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('aymax_dashboard', id);
    this.setState({ dashboard: id, dashboardMenuOpen: false });
  };
  openTimeline = () => this.setState({ timelineOpen: true });
  closeTimeline = () => this.setState({ timelineOpen: false });
  stopProp = e => e.stopPropagation();

  renderVals() {
    const s = this.state;
    const isDark = s.theme === 'dark';
    const meta = TITLES[s.dashboard] || TITLES.employee;

    const dashboardOptions = DASHBOARD_OPTIONS.map(d => ({ ...d, weight: d.id === s.dashboard ? 700 : 400, onClick: () => this.setDashboard(d.id) }));
    const dashboardLabel = meta.title.replace('Tableau de bord ', '');

    const hr = { ...s.hr, rewards: s.hr.rewards.map(r => ({ ...r, pointsLabel: r.points.toLocaleString('fr-FR') + ' points' })) };

    return {
      theme: s.theme, isDark, isLight: !isDark, toggleTheme: this.toggleTheme,
      dashboardMenuOpen: s.dashboardMenuOpen, toggleDashboardMenu: this.toggleDashboardMenu, dashboardOptions, dashboardLabel,
      dashboardTitle: meta.title, dashboardSubtitle: meta.subtitle, userInitials: meta.initials,
      isEmployee: s.dashboard === 'employee', isManager: s.dashboard === 'manager', isHR: s.dashboard === 'hr', isAdmin: s.dashboard === 'admin', isIntern: s.dashboard === 'intern',
      emp: s.emp, mgr: s.mgr, hr, admin: s.admin, intern: s.intern,
      timelineOpen: s.timelineOpen, openTimeline: this.openTimeline, closeTimeline: this.closeTimeline, stopProp: this.stopProp,
    };
  }
}
```
