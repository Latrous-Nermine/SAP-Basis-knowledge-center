# Design reference — Experts

> **Annuaire des experts (liste + détail)**
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
      <input class="input" style="padding-left:34px;background:var(--color-bg);border-color:var(--color-divider)" placeholder="Rechercher un expert, une compétence…" value="{{ searchQuery }}" sc-camel-on-change="{{ setSearchQuery }}">
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-left:16px;flex:none">
      <button class="btn btn-icon btn-secondary" sc-camel-on-click="{{ toggleTheme }}" title="Changer de thème">
        <sc-if value="{{ isDark }}" hint-placeholder-val="{{ false }}"><!-- icon --></sc-if>
        <sc-if value="{{ isLight }}" hint-placeholder-val="{{ true }}"><!-- icon --></sc-if>
      </button>
      <a href="AYMAX Knowledge Hub - Profile.dc.html" style="border:none;background:none;cursor:pointer;padding:0;text-decoration:none" title="Profil">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--color-accent-700);color:var(--color-bg);display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:600;font-size:13px">SB</div>
      </a>
    </div>
  </header>
  <div style="max-width:1400px;margin:0 auto;padding:24px 24px 80px;display:flex;flex-direction:column;gap:20px">
    <sc-if value="{{ listView }}" hint-placeholder-val="{{ true }}">
      <div style="font-family:var(--font-heading);font-weight:600;font-size:24px">Experts</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <sc-for list="{{ deptFilters }}" as="f" hint-placeholder-count="4">
          <button class="btn {{ f.btnClass }}" sc-camel-on-click="{{ f.onClick }}">{{ f.label }}</button>
        </sc-for>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
        <sc-for list="{{ experts }}" as="ex" hint-placeholder-count="6">
          <article class="card blueprint elev-sm" style="padding:20px;gap:10px;cursor:pointer" sc-camel-on-click="{{ ex.onOpen }}">
            <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
            <div style="display:flex;gap:12px;align-items:center">
              <div style="width:52px;height:52px;border-radius:50%;background:{{ ex.avatarColor }};color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:600;font-size:18px;flex:none">{{ ex.initials }}</div>
              <div style="min-width:0">
                <div style="font-family:var(--font-heading);font-weight:600;font-size:16px">{{ ex.name }}</div>
                <div style="font-size:12px;opacity:.7">{{ ex.position }}</div>
                <div style="font-size:11px;opacity:.55">{{ ex.dept }}</div>
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <sc-for list="{{ ex.badges }}" as="b" hint-placeholder-count="2"><span class="tag tag-accent">{{ b }}</span></sc-for>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;opacity:.65;padding-top:8px;border-top:1px solid var(--color-divider)">
              <span>{{ ex.reputation }} pts</span>
              <span>{{ ex.contributions }} contributions</span>
            </div>
          </article>
        </sc-for>
      </div>
    </sc-if>
    <sc-if value="{{ detailView }}" hint-placeholder-val="{{ false }}">
      <button class="btn btn-ghost" style="align-self:flex-start" sc-camel-on-click="{{ closeDetail }}">← Retour aux experts</button>
      <div style="display:grid;grid-template-columns:320px minmax(0,1fr);gap:20px">
        <div class="card blueprint elev-sm" style="padding:22px;align-items:center;text-align:center;gap:8px">
          <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
          <div style="width:76px;height:76px;border-radius:50%;background:{{ activeExpert.avatarColor }};color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:600;font-size:26px;margin-bottom:6px">{{ activeExpert.initials }}</div>
          <div style="font-family:var(--font-heading);font-weight:600;font-size:20px">{{ activeExpert.name }}</div>
          <div style="font-size:13px;opacity:.7">{{ activeExpert.position }}</div>
          <div style="font-size:12px;opacity:.55">{{ activeExpert.dept }}</div>
          <p style="font-size:13px;line-height:1.6;opacity:.85;text-align:left;margin:10px 0 0">{{ activeExpert.bio }}</p>
          <div style="display:flex;gap:16px;margin-top:12px;padding-top:12px;border-top:1px solid var(--color-divider);width:100%;justify-content:center">
            <div><div style="font-family:var(--font-heading);font-weight:600;font-size:17px">{{ activeExpert.reputation }}</div><div style="font-size:10px;opacity:.6;text-transform:uppercase">Réputation</div></div>
            <div><div style="font-family:var(--font-heading);font-weight:600;font-size:17px">{{ activeExpert.badgeCount }}</div><div style="font-size:10px;opacity:.6;text-transform:uppercase">Badges</div></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
          <div class="card blueprint elev-sm" style="padding:18px;gap:10px">
            <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
            <div class="card-kicker">Expertise</div>
            <sc-for list="{{ activeExpert.expertise }}" as="sk" hint-placeholder-count="5">
              <div style="padding:6px 0">
                <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span>{{ sk.name }}</span><span style="letter-spacing:1px;color:var(--color-accent)">{{ sk.stars }}</span></div>
                <div style="height:5px;background:var(--color-neutral-200)"><div style="height:100%;background:var(--color-accent);width:{{ sk.percent }}"></div></div>
              </div>
            </sc-for>
          </div>
          <div class="card blueprint elev-sm" style="padding:18px;gap:10px">
            <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
            <div class="card-kicker">Badges</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <sc-for list="{{ activeExpert.badges }}" as="b" hint-placeholder-count="3"><span class="tag tag-accent">{{ b }}</span></sc-for>
            </div>
          </div>
          <div class="card blueprint elev-sm" style="padding:18px;gap:12px">
            <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
            <div class="card-kicker">Activité récente</div>
            <sc-for list="{{ activeExpert.activity }}" as="a" hint-placeholder-count="4">
              <div style="display:flex;gap:12px;align-items:flex-start;padding:6px 0;border-left:2px solid var(--color-divider);padding-left:12px">
                <div style="flex:1">
                  <div style="font-size:13px">{{ a.text }}</div>
                  <div style="font-size:11px;opacity:.55;margin-top:2px">{{ a.time }}</div>
                </div>
              </div>
            </sc-for>
          </div>
        </div>
      </div>
    </sc-if>
  </div>
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
    theme: 'light', searchQuery: '', deptFilter: 'toutes', detailId: null,
    experts: [
      {
        id: 'e1', name: 'Nadia Ferchichi', position: 'Consultante SAP HANA', dept: 'Solutions SAP', initials: 'NF', avatarColor: '#597ea3', avatarId: 'nadia',
        bio: "Consultante SAP HANA depuis 7 ans chez Aymax Tunisie, spécialisée en optimisation de performance et migration vers HANA Cloud pour des clients grands comptes.",
        badges: ['Contributeur Expert', 'Mentor', 'Top réponse'], reputation: 2140, badgeCount: 9, contributions: 64,
        expertise: [
          { name: 'SAP HANA', stars: '★★★★★', percent: '96%' },
          { name: 'SAP BTP', stars: '★★★★★', percent: '92%' },
          { name: 'Business Intelligence', stars: '★★★★☆', percent: '80%' },
          { name: 'CDS Views', stars: '★★★★☆', percent: '84%' },
        ],
        activity: [
          { text: 'A publié « Retour d\u2019expérience sur la migration vers SAP HANA Cloud »', time: 'Il y a 2 h' },
          { text: 'A répondu à « Meilleure approche pour exposer une vue CDS en OData V4 »', time: 'Il y a 5 h' },
          { text: 'A obtenu le badge « Contributeur Expert »', time: 'Hier' },
        ],
      },
      {
        id: 'e2', name: 'Karim Trabelsi', position: 'Développeur Cloud Foundry', dept: 'Développement Digital', initials: 'KT', avatarColor: '#7e9cb8', avatarId: 'karim',
        bio: "Développeur full-stack orienté Cloud Foundry et CAP, en charge de l\u2019architecture technique de la plateforme Portail Client.",
        badges: ['Réponse acceptée x12', 'Contributeur actif'], reputation: 1875, badgeCount: 7, contributions: 51,
        expertise: [
          { name: 'CAP', stars: '★★★★★', percent: '90%' },
          { name: 'Cloud Foundry', stars: '★★★★★', percent: '94%' },
          { name: 'Java / Spring Boot', stars: '★★★★☆', percent: '82%' },
          { name: 'Docker', stars: '★★★☆☆', percent: '62%' },
        ],
        activity: [
          { text: 'A répondu à « Erreur de déploiement CAP sur Cloud Foundry » — réponse acceptée', time: 'Il y a 2 h' },
          { text: 'A publié une bonne pratique sur l\u2019authentification JWT + OAuth2', time: 'Hier' },
        ],
      },
      {
        id: 'e3', name: 'Ines Chaabane', position: 'UX Designer SAP Fiori', dept: 'Solutions SAP', initials: 'IC', avatarColor: '#416180', avatarId: 'ines',
        bio: "UX designer spécialisée SAP Fiori Elements, garante de la cohérence des interfaces sur les projets finance et logistique.",
        badges: ['Design System Owner', 'Top contributeur'], reputation: 1520, badgeCount: 6, contributions: 38,
        expertise: [
          { name: 'SAP Fiori', stars: '★★★★★', percent: '95%' },
          { name: 'UX Design', stars: '★★★★★', percent: '90%' },
          { name: 'Angular', stars: '★★★☆☆', percent: '58%' },
        ],
        activity: [
          { text: 'A publié le gabarit « Fiori Elements — reporting »', time: 'Il y a 2 jours' },
          { text: 'A commenté sur la Room Plateforme Portail Client', time: 'Il y a 3 jours' },
        ],
      },
      {
        id: 'e4', name: 'Yassine Gharbi', position: 'Architecte Intégration', dept: 'Gestion des données', initials: 'YG', avatarColor: '#749dc4', avatarId: 'yassine',
        bio: "Architecte spécialisé dans la centralisation et l\u2019optimisation des flux de données inter-applicatifs.",
        badges: ['Question bien posée'], reputation: 980, badgeCount: 4, contributions: 22,
        expertise: [
          { name: 'Intégration de données', stars: '★★★★☆', percent: '78%' },
          { name: 'SAP BTP', stars: '★★★☆☆', percent: '60%' },
        ],
        activity: [
          { text: 'A posé « Erreur de déploiement CAP sur Cloud Foundry »', time: 'Il y a 3 h' },
        ],
      },
    ],
  };

  toggleTheme = () => this.setState(s => ({ theme: s.theme === 'light' ? 'dark' : 'light' }));
  toggleDashboardMenu = () => this.setState(s => ({ dashboardMenuOpen: !s.dashboardMenuOpen }));
  setDashboard = id => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('aymax_dashboard', id);
    this.setState({ dashboard: id, dashboardMenuOpen: false });
  };
  setSearchQuery = e => this.setState({ searchQuery: e.target.value });
  setDeptFilter = d => this.setState({ deptFilter: d });
  openDetail = id => this.setState({ detailId: id });
  closeDetail = () => this.setState({ detailId: null });

  renderVals() {
    const s = this.state;
    const isDark = s.theme === 'dark';
    const dashboardOptions = DASHBOARD_OPTIONS.map(d => ({ ...d, weight: d.id === s.dashboard ? 700 : 400, onClick: () => this.setDashboard(d.id) }));
    const dashboardLabel = (DASHBOARD_OPTIONS.find(d => d.id === s.dashboard) || DASHBOARD_OPTIONS[0]).label.replace('Tableau de bord ', '');

    const depts = ['toutes', 'Solutions SAP', 'Développement Digital', 'Gestion des données'];
    const deptFilters = depts.map(d => ({ label: d === 'toutes' ? 'Tous' : d, btnClass: s.deptFilter === d ? 'btn-primary' : 'btn-secondary', onClick: () => this.setDeptFilter(d) }));

    let filtered = s.deptFilter === 'toutes' ? s.experts : s.experts.filter(e => e.dept === s.deptFilter);
    if (s.searchQuery.trim()) {
      const q = s.searchQuery.toLowerCase();
      filtered = filtered.filter(e => e.name.toLowerCase().includes(q) || e.expertise.some(x => x.name.toLowerCase().includes(q)));
    }

    const experts = filtered.map(ex => ({ ...ex, onOpen: () => this.openDetail(ex.id) }));

    const activeExpert = s.detailId ? s.experts.find(e => e.id === s.detailId) : null;

    return {
      theme: s.theme, isDark, isLight: !isDark, toggleTheme: this.toggleTheme,
      dashboardMenuOpen: s.dashboardMenuOpen, toggleDashboardMenu: this.toggleDashboardMenu, dashboardOptions, dashboardLabel,
      searchQuery: s.searchQuery, setSearchQuery: this.setSearchQuery,
      deptFilters, experts,
      listView: !s.detailId, detailView: !!s.detailId, closeDetail: this.closeDetail,
      activeExpert,
    };
  }
}
```
