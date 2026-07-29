# Design reference — Profile

> **Profil personnel, réputation, certifications**
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
  <div style="position:absolute;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none">
  </div>
  <header class="nav" style="position:sticky;top:0;z-index:40;background:var(--color-bg);border-bottom:1px solid var(--color-divider);padding-left:24px;padding-right:24px">
    <div class="nav-brand" style="display:flex;align-items:center;gap:10px">
      <div style="width:32px;height:32px;background:var(--color-accent);color:var(--color-bg);display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:700;font-size:16px;flex:none">A</div>
      <div style="display:flex;flex-direction:column;line-height:1.1">
        <span style="font-size:17px">AYMAX</span>
        <span style="font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--color-accent);font-family:var(--font-body)">knowledge hub</span>
      </div>
    </div>
    <nav style="display:flex;gap:14px;align-items:center;flex:none;font-size:13px">
      <a href="AYMAX Knowledge Hub - Dashboard.dc.html">Tableau de bord</a>
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
    <div style="position:relative;flex:1 1 260px;min-width:260px;max-width:420px;margin-left:20px">
      <!-- icon -->
      <input class="input" style="padding-left:34px;background:var(--color-bg);border-color:var(--color-divider)" placeholder="Rechercher questions, articles, experts, tags…">
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-left:16px;flex:none">
      <button class="btn btn-icon btn-secondary" sc-camel-on-click="{{ toggleTheme }}" title="Changer de thème">
        <sc-if value="{{ isDark }}" hint-placeholder-val="{{ false }}"><!-- icon --></sc-if>
        <sc-if value="{{ isLight }}" hint-placeholder-val="{{ true }}"><!-- icon --></sc-if>
      </button>
      <div style="width:32px;height:32px;border-radius:50%;background:var(--color-accent-700);color:var(--color-bg);display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:600;font-size:13px">SB</div>
    </div>
  </header>
  <!-- COVER -->
  <div class="blueprint duotone" style="height:160px;max-width:1400px;margin:24px auto 0;position:relative">
    <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
    <image-slot id="profile-cover" shape="rect" placeholder="Photo de couverture" style="width:100%;height:100%"></image-slot>
  </div>
  <div style="max-width:1400px;margin:0 auto;padding:0 24px 80px;display:flex;flex-direction:column;gap:20px">
    <!-- HEADER -->
    <div style="display:flex;align-items:flex-end;gap:20px;margin-top:-46px">
      <div style="width:92px;height:92px;border-radius:50%;background:var(--color-accent-700);color:var(--color-bg);display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:600;font-size:32px;border:4px solid var(--color-bg);flex:none">SB</div>
      <div style="flex:1;padding-bottom:6px;min-width:0">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:nowrap">
          <div style="font-family:var(--font-heading);font-weight:600;font-size:24px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0">Sami Ben Youssef</div>
          <span class="tag tag-accent" style="font-size:11px;flex:none">{{ expertiseLevel }}</span>
        </div>
        <div style="font-size:13px;opacity:.7;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Consultant SAP BTP · Solutions SAP · Aymax Tunisie</div>
      </div>
      <button class="btn btn-secondary" sc-camel-on-click="{{ openTimeline }}" style="margin-bottom:6px">Voir la timeline</button>
      <button class="btn btn-primary" style="margin-bottom:6px">Modifier le profil</button>
    </div>
    <p style="font-size:14px;line-height:1.7;max-width:720px;opacity:.9">Consultant SAP BTP chez Aymax Tunisie, j'interviens sur des projets de conseil en transformation digitale et d'intégration de solutions SAP pour des clients grands comptes, avec un intérêt particulier pour Cloud Foundry, CAP et Fiori Elements.</p>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
      <div class="card elev-sm" style="padding:18px;background:linear-gradient(135deg, var(--color-primary), var(--color-secondary));border:none;color:#fff">
        <div class="card-kicker" style="color:rgba(255,255,255,.75)">Score total</div>
        <div style="font-family:var(--font-heading);font-weight:700;font-size:28px">{{ totalScore }} pts</div>
        <div style="font-size:11.5px;opacity:.85">Badges + Publications + Contributions</div>
      </div>
      <div class="card elev-sm" style="padding:18px">
        <div class="card-kicker">Badges</div>
        <div style="font-family:var(--font-heading);font-weight:700;font-size:22px">{{ badgePoints }} pts</div>
        <div style="height:6px;background:var(--color-neutral-200);border-radius:999px;margin-top:4px"><div style="height:100%;border-radius:999px;background:var(--color-accent);width:{{ badgeProgressPct }}"></div></div>
        <div style="font-size:11px;opacity:.6">{{ badgePoints }} / {{ badgeGoal }}</div>
      </div>
      <div class="card elev-sm" style="padding:18px">
        <div class="card-kicker">Publications</div>
        <div style="font-family:var(--font-heading);font-weight:700;font-size:22px">{{ publicationPoints }} pts</div>
        <div style="font-size:11px;opacity:.6">Articles approuvés, partage de connaissances</div>
      </div>
      <div class="card elev-sm" style="padding:18px">
        <div class="card-kicker">Contributions</div>
        <div style="font-family:var(--font-heading);font-weight:700;font-size:22px">{{ contributionPoints }} pts</div>
        <div style="font-size:11px;opacity:.6">Réponses, commentaires utiles</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:20px">
      <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <sc-for list="{{ tabs }}" as="tab" hint-placeholder-count="5">
            <button class="btn {{ tab.btnClass }}" sc-camel-on-click="{{ tab.onClick }}">{{ tab.label }}</button>
          </sc-for>
        </div>
        <sc-if value="{{ isPublications }}" hint-placeholder-val="{{ true }}">
          <sc-for list="{{ publications }}" as="p" hint-placeholder-count="3">
            <article class="card blueprint elev-sm" style="padding:16px;gap:6px">
              <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
              <div style="font-size:14px;line-height:1.6">{{ p.content }}</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px"><span class="tag tag-accent">{{ p.topic }}</span></div>
              <div style="font-size:11px;opacity:.55;margin-top:4px">{{ p.time }} · {{ p.likeCount }} mentions « j'aime »</div>
            </article>
          </sc-for>
        </sc-if>
        <sc-if value="{{ isActivity }}" hint-placeholder-val="{{ false }}">
          <div class="card blueprint elev-sm" style="padding:18px;gap:12px">
            <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
            <sc-for list="{{ activityTimeline }}" as="a" hint-placeholder-count="6">
              <div style="padding:8px 0;border-left:2px solid var(--color-divider);padding-left:12px">
                <div style="font-size:13px">{{ a.text }}</div>
                <div style="font-size:11px;opacity:.55;margin-top:2px">{{ a.time }}</div>
              </div>
            </sc-for>
          </div>
        </sc-if>
        <sc-if value="{{ isCerts }}" hint-placeholder-val="{{ false }}">
          <div style="display:flex;justify-content:flex-end">
            <button class="btn btn-secondary" sc-camel-on-click="{{ openAddCert }}">+ Ajouter une certification</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:14px">
            <div class="card elev-sm" style="padding:16px;gap:10px">
              <div class="card-kicker" style="color:var(--color-success)">Obtenues</div>
              <sc-for list="{{ certsEarned }}" as="c" hint-placeholder-count="2">
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid var(--color-divider)">
                  <div><div style="font-size:13.5px;font-weight:600">{{ c.name }}</div><div style="font-size:11px;opacity:.6">{{ c.date }}</div></div>
                  <span class="tag tag-success">Obtenue</span>
                </div>
              </sc-for>
            </div>
            <div class="card elev-sm" style="padding:16px;gap:10px">
              <div class="card-kicker">En cours</div>
              <sc-for list="{{ certsInProgress }}" as="c" hint-placeholder-count="2">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-top:1px solid var(--color-divider)">
                  <div>
                    <div style="font-size:13.5px;font-weight:600">{{ c.name }}</div>
                    <sc-if value="{{ c.provider }}" hint-placeholder-val="{{ false }}"><div style="font-size:11px;opacity:.6">Organisme : {{ c.provider }}</div></sc-if>
                    <sc-if value="{{ c.startDate }}" hint-placeholder-val="{{ false }}"><div style="font-size:11px;opacity:.6">Débutée le {{ c.startDate }}</div></sc-if>
                  </div>
                  <span class="tag tag-accent">En cours</span>
                </div>
              </sc-for>
            </div>
            <div class="card elev-sm" style="padding:16px;gap:10px">
              <div class="card-kicker">Recommandées</div>
              <sc-for list="{{ certsRecommended }}" as="c" hint-placeholder-count="2">
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid var(--color-divider)">
                  <div><div style="font-size:13.5px;font-weight:600">{{ c.name }}</div><div style="font-size:11px;opacity:.6">{{ c.reason }}</div></div>
                  <button class="btn btn-ghost" style="font-size:12px">Commencer</button>
                </div>
              </sc-for>
            </div>
          </div>
        </sc-if>
      </div>
      <aside style="display:flex;flex-direction:column;gap:16px;min-width:0">
        <div class="card elev-sm" style="padding:14px">
          <div class="card-kicker">Expertise</div>
          <sc-for list="{{ expertise }}" as="sk" hint-placeholder-count="5">
            <div style="padding:6px 0">
              <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px"><span>{{ sk.name }}</span><span style="letter-spacing:1px;color:var(--color-accent)">{{ sk.stars }}</span></div>
              <div style="height:5px;background:var(--color-neutral-200);border-radius:999px"><div style="height:100%;border-radius:999px;background:var(--color-accent);width:{{ sk.percent }}"></div></div>
            </div>
          </sc-for>
        </div>
        <div class="card elev-sm" style="padding:14px">
          <div class="card-kicker">Historique des badges</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
            <sc-for list="{{ badges }}" as="b" hint-placeholder-count="6"><span class="tag tag-accent">{{ b }}</span></sc-for>
          </div>
        </div>
      </aside>
    </div>
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
        <div class="ayx-scroll" style="max-height:60vh;overflow:auto;display:flex;flex-direction:column;gap:16px">
          <sc-for list="{{ timelineMonths }}" as="m" hint-placeholder-count="2">
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

class Component extends DCLogic {
  state = {
    dashboard: (typeof localStorage !== 'undefined' && localStorage.getItem('aymax_dashboard')) || 'employee',
    dashboardMenuOpen: false,
    theme: 'light', activeTab: 'publications', timelineOpen: false,
    badgePoints: 400, badgeGoal: 1000,
    publicationPoints: 480,
    contributionPoints: 320,
    certsEarned: [
      { name: 'SAP BTP Associate', date: 'Obtenue en mars 2026' },
      { name: 'SAP Fiori Elements Developer', date: 'Obtenue en janvier 2026' },
    ],
    certsInProgress: [
      { name: 'Cloud Foundry Advanced', provider: 'SAP Learning', startDate: '2 juin 2026' },
      { name: 'SAP HANA Cloud Specialist', provider: 'SAP Learning', startDate: '14 avril 2026' },
    ],
    certsRecommended: [
      { name: 'Spring Boot Professional', reason: 'Basé sur vos compétences Java' },
      { name: 'SAP Integration Suite', reason: 'Basé sur votre progression SAP BTP' },
    ],
    timelineMonths: [
      { label: 'Juillet 2026', entries: [
        { points: 50, label: 'Publication approuvée' },
        { points: 25, label: 'Réponse acceptée' },
        { points: 100, label: 'Documentation validée' },
      ]},
      { label: 'Juin 2026', entries: [
        { points: 30, label: 'Commentaire utile' },
        { points: 75, label: 'Article publié' },
      ]},
    ],
    publications: [
      { content: "Retour d'expérience sur la migration vers SAP HANA Cloud menée ce trimestre : gain de 34% sur les temps de traitement batch.", topic: 'SAP BTP', time: 'Il y a 2 jours', likeCount: 12 },
      { content: "Nouveau modèle de Fiori Elements disponible pour les écrans de reporting.", topic: 'Solutions SAP', time: 'Il y a 1 semaine', likeCount: 27 },
    ],
    activityTimeline: [
      { text: 'A répondu à « Erreur de déploiement CAP sur Cloud Foundry »', time: 'Il y a 2 h' },
      { text: 'A publié un retour d\u2019expérience sur la migration HANA Cloud', time: 'Il y a 2 jours' },
      { text: 'A obtenu le badge « Contributeur Expert »', time: 'Il y a 3 jours' },
      { text: 'A rejoint la room « Projet Atlas SAP BTP »', time: 'Il y a 1 semaine' },
    ],
    certifications: [
      { name: 'SAP BTP Associate', date: 'Obtenue en mars 2026' },
      { name: 'SAP Fiori Elements Developer', date: 'Obtenue en janvier 2026' },
    ],
    expertise: [
      { name: 'SAP BTP', stars: '★★★★★', percent: '92%' },
      { name: 'Java / Spring Boot', stars: '★★★★☆', percent: '80%' },
      { name: 'SAP Fiori', stars: '★★★★☆', percent: '78%' },
      { name: 'Angular', stars: '★★★☆☆', percent: '60%' },
      { name: 'Docker', stars: '★★★☆☆', percent: '55%' },
    ],
    badges: ['Contributeur Expert', 'Mentor', 'Réponse acceptée x8', 'Article publié'],
  };

  toggleTheme = () => this.setState(s => ({ theme: s.theme === 'light' ? 'dark' : 'light' }));
  toggleDashboardMenu = () => this.setState(s => ({ dashboardMenuOpen: !s.dashboardMenuOpen }));
  setDashboard = id => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('aymax_dashboard', id);
    this.setState({ dashboard: id, dashboardMenuOpen: false });
  };
  setTab = t => this.setState({ activeTab: t });
  openTimeline = () => this.setState({ timelineOpen: true });
  closeTimeline = () => this.setState({ timelineOpen: false });
  stopProp = e => e.stopPropagation();
  openAddCert = () => {};

  renderVals() {
    const s = this.state;
    const isDark = s.theme === 'dark';
    const dashboardOptions = DASHBOARD_OPTIONS.map(d => ({ ...d, weight: d.id === s.dashboard ? 700 : 400, onClick: () => this.setDashboard(d.id) }));
    const dashboardLabel = (DASHBOARD_OPTIONS.find(d => d.id === s.dashboard) || DASHBOARD_OPTIONS[0]).label.replace('Tableau de bord ', '');

    const tabDefs = [
      { id: 'publications', label: 'Publications' },
      { id: 'activity', label: 'Activité' },
      { id: 'certs', label: 'Certifications' },
    ];
    const tabs = tabDefs.map(t => ({ label: t.label, btnClass: s.activeTab === t.id ? 'btn-primary' : 'btn-secondary', onClick: () => this.setTab(t.id) }));

    const totalScore = s.badgePoints + s.publicationPoints + s.contributionPoints;
    const expertiseLevel = totalScore >= 1500 ? 'Master' : totalScore >= 1000 ? 'Spécialiste' : totalScore >= 600 ? 'Expert' : totalScore >= 250 ? 'Contributeur' : 'Débutant';

    return {
      theme: s.theme, isDark, isLight: !isDark, toggleTheme: this.toggleTheme,
      dashboardMenuOpen: s.dashboardMenuOpen, toggleDashboardMenu: this.toggleDashboardMenu, dashboardOptions, dashboardLabel,
      tabs,
      isPublications: s.activeTab === 'publications', isActivity: s.activeTab === 'activity', isCerts: s.activeTab === 'certs',
      publications: s.publications, activityTimeline: s.activityTimeline,
      expertise: s.expertise, badges: s.badges,
      totalScore, expertiseLevel,
      badgePoints: s.badgePoints, badgeGoal: s.badgeGoal, badgeProgressPct: Math.min(100, (s.badgePoints / s.badgeGoal) * 100) + '%',
      publicationPoints: s.publicationPoints, contributionPoints: s.contributionPoints,
      certsEarned: s.certsEarned, certsInProgress: s.certsInProgress, certsRecommended: s.certsRecommended,
      openAddCert: this.openAddCert,
      timelineOpen: s.timelineOpen, openTimeline: this.openTimeline, closeTimeline: this.closeTimeline, stopProp: this.stopProp,
      timelineMonths: s.timelineMonths,
    };
  }
}
```
