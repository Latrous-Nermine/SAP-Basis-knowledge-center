# Design reference — Search

> **Recherche globale + page de résultats autonome**
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
    <div style="position:relative;flex:1 1 260px;min-width:260px;max-width:460px;margin-left:16px">
      <!-- icon -->
      <input class="input" style="padding-left:34px;background:var(--color-bg);border-color:var(--color-divider)" placeholder="Rechercher questions, articles, experts, tags…" value="{{ query }}" sc-camel-on-change="{{ setQuery }}" sc-camel-auto-focus="{{ true }}">
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-left:16px;flex:none">
      <button class="btn btn-icon btn-secondary" sc-camel-on-click="{{ toggleTheme }}" title="Changer de thème">
        <sc-if value="{{ isDark }}" hint-placeholder-val="{{ false }}"><!-- icon --></sc-if>
        <sc-if value="{{ isLight }}" hint-placeholder-val="{{ true }}"><!-- icon --></sc-if>
      </button>
      <a href="AYMAX Knowledge Hub - Profile.dc.html" style="text-decoration:none">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--color-accent-700);color:var(--color-bg);display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:600;font-size:13px">SB</div>
      </a>
    </div>
  </header>
  <div style="max-width:1000px;margin:0 auto;padding:32px 24px 80px;display:flex;flex-direction:column;gap:20px">
    <sc-if value="{{ hasQuery }}" hint-placeholder-val="{{ false }}">
      <div style="font-size:14px;opacity:.7">{{ resultCountLabel }} pour « {{ query }} »</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <sc-for list="{{ typeTabs }}" as="t" hint-placeholder-count="9">
          <button class="btn {{ t.btnClass }}" sc-camel-on-click="{{ t.onClick }}">{{ t.label }} <span style="opacity:.6;margin-left:4px">{{ t.count }}</span></button>
        </sc-for>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <sc-for list="{{ results }}" as="r" hint-placeholder-count="5">
          <article class="card blueprint elev-sm" style="padding:16px;gap:6px">
            <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="tag tag-outline">{{ r.type }}</span>
              <span style="font-size:11px;opacity:.5">{{ r.meta }}</span>
            </div>
            <div style="font-family:var(--font-heading);font-weight:600;font-size:16px">{{ r.title }}</div>
            <div style="font-size:13px;opacity:.75">{{ r.excerpt }}</div>
          </article>
        </sc-for>
      </div>
    </sc-if>
    <sc-if value="{{ hasNoQuery }}" hint-placeholder-val="{{ true }}">
      <div style="font-family:var(--font-heading);font-weight:600;font-size:20px">Rechercher dans AYMAX knowledge hub</div>
      <div style="font-size:14px;opacity:.65;max-width:520px">Questions, articles, documentation, rapports, rooms, experts, sujets, tags, publications et certifications — tout au même endroit.</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
        <sc-for list="{{ suggestions }}" as="s" hint-placeholder-count="6">
          <button class="tag tag-neutral" style="cursor:pointer;border:none" sc-camel-on-click="{{ s.onClick }}">{{ s.label }}</button>
        </sc-for>
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
    theme: 'light', query: '', activeType: 'tous',
    suggestions: ['SAP BTP', 'CAP', 'HANA', 'Fiori Elements', 'JWT', 'Docker'],
    allResults: [
      { type: 'Question', title: 'Erreur de déploiement CAP sur Cloud Foundry : "xsuaa binding not found"', excerpt: 'Le binding XSUAA n\u2019est pas reconnu au démarrage…', meta: 'SAP BTP · Résolue' },
      { type: 'Article', title: 'Standardiser l\u2019authentification des micro-services CAP avec JWT + OAuth2', excerpt: 'Bonne pratique adoptée sur le projet Portail Client…', meta: 'Développement Digital' },
      { type: 'Documentation', title: 'Guide de paramétrage des vues CDS pour la migration HANA Cloud', excerpt: 'Pièges à éviter et check-list de paramétrage…', meta: 'SAP BTP' },
      { type: 'Expert', title: 'Nadia Ferchichi — Consultante SAP HANA', excerpt: 'SAP HANA ★★★★★ · SAP BTP ★★★★★', meta: 'Solutions SAP' },
      { type: 'Room', title: 'Migration HANA Cloud', excerpt: '12 membres · Migration du paysage SAP vers HANA Cloud', meta: 'SAP BTP' },
      { type: 'Sujet', title: 'SAP BTP', excerpt: 'Cloud Foundry, CAP, HANA, Build Apps, Workflow', meta: '24 articles · 38 questions' },
      { type: 'Tag', title: 'CAP', excerpt: '33 contenus liés', meta: 'Tag' },
      { type: 'Publication', title: 'Retour d\u2019expérience — migration HANA Cloud', excerpt: 'Gain de 34% sur les temps de traitement batch…', meta: 'Nadia Ferchichi' },
      { type: 'Certification', title: 'SAP BTP Associate', excerpt: 'Fondamentaux de la plateforme cloud SAP BTP', meta: 'Obtenue' },
    ],
  };

  toggleTheme = () => this.setState(s => ({ theme: s.theme === 'light' ? 'dark' : 'light' }));
  toggleDashboardMenu = () => this.setState(s => ({ dashboardMenuOpen: !s.dashboardMenuOpen }));
  setDashboard = id => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('aymax_dashboard', id);
    this.setState({ dashboard: id, dashboardMenuOpen: false });
  };
  setQuery = e => this.setState({ query: e.target.value, activeType: 'tous' });
  setActiveType = t => this.setState({ activeType: t });
  setQueryDirect = q => this.setState({ query: q, activeType: 'tous' });

  renderVals() {
    const s = this.state;
    const isDark = s.theme === 'dark';
    const dashboardOptions = DASHBOARD_OPTIONS.map(d => ({ ...d, weight: d.id === s.dashboard ? 700 : 400, onClick: () => this.setDashboard(d.id) }));
    const dashboardLabel = (DASHBOARD_OPTIONS.find(d => d.id === s.dashboard) || DASHBOARD_OPTIONS[0]).label.replace('Tableau de bord ', '');
    const hasQuery = s.query.trim().length > 0;

    let filtered = s.allResults;
    if (hasQuery) {
      const q = s.query.toLowerCase();
      filtered = filtered.filter(r => r.title.toLowerCase().includes(q) || r.excerpt.toLowerCase().includes(q) || r.type.toLowerCase().includes(q));
      if (filtered.length === 0) filtered = s.allResults.slice(0, 3);
    }

    const types = ['tous', ...Array.from(new Set(filtered.map(r => r.type)))];
    const typeTabs = types.map(t => ({
      label: t === 'tous' ? 'Tout' : t + 's',
      count: t === 'tous' ? filtered.length : filtered.filter(r => r.type === t).length,
      btnClass: s.activeType === t ? 'btn-primary' : 'btn-secondary',
      onClick: () => this.setActiveType(t),
    }));

    const results = s.activeType === 'tous' ? filtered : filtered.filter(r => r.type === s.activeType);

    const suggestions = s.suggestions.map(label => ({ label, onClick: () => this.setQueryDirect(label) }));

    return {
      theme: s.theme, isDark, isLight: !isDark, toggleTheme: this.toggleTheme,
      dashboardMenuOpen: s.dashboardMenuOpen, toggleDashboardMenu: this.toggleDashboardMenu, dashboardOptions, dashboardLabel,
      query: s.query, setQuery: this.setQuery,
      hasQuery, hasNoQuery: !hasQuery,
      resultCountLabel: results.length + (results.length > 1 ? ' résultats' : ' résultat'),
      typeTabs, results, suggestions,
    };
  }
}
```
