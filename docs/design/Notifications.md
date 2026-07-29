# Design reference — Notifications

> **Historique des notifications**
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
    <div style="flex:1"></div>
    <div style="display:flex;align-items:center;gap:8px;flex:none">
      <button class="btn btn-icon btn-secondary" sc-camel-on-click="{{ toggleTheme }}" title="Changer de thème">
        <sc-if value="{{ isDark }}" hint-placeholder-val="{{ false }}"><!-- icon --></sc-if>
        <sc-if value="{{ isLight }}" hint-placeholder-val="{{ true }}"><!-- icon --></sc-if>
      </button>
      <a href="AYMAX Knowledge Hub - Profile.dc.html" style="text-decoration:none">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--color-accent-700);color:var(--color-bg);display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:600;font-size:13px">SB</div>
      </a>
    </div>
  </header>
  <div style="max-width:760px;margin:0 auto;padding:32px 24px 80px;display:flex;flex-direction:column;gap:16px">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div style="font-family:var(--font-heading);font-weight:600;font-size:24px">Notifications</div>
      <button class="btn btn-ghost" sc-camel-on-click="{{ markAllRead }}">Tout marquer comme lu</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <sc-for list="{{ notifications }}" as="n" hint-placeholder-count="8">
        <div class="card blueprint elev-sm" style="padding:14px 16px;flex-direction:row;align-items:center;gap:12px;background:{{ n.bg }}">
          <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
          <div style="width:34px;height:34px;border:1px solid var(--color-divider);display:flex;align-items:center;justify-content:center;color:var(--color-accent);flex:none">
            <!-- icon -->
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13.5px">{{ n.text }}</div>
            <div style="font-size:11px;opacity:.55;margin-top:2px">{{ n.time }} · {{ n.category }}</div>
          </div>
          <sc-if value="{{ n.unread }}" hint-placeholder-val="{{ false }}">
            <div style="width:8px;height:8px;border-radius:50%;background:var(--color-accent);flex:none"></div>
          </sc-if>
        </div>
      </sc-for>
    </div>
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
    theme: 'light',
    notifications: [
      { text: 'Karim Trabelsi a commenté votre publication sur la migration HANA.', time: 'Il y a 20 min', category: 'Commentaire', unread: true },
      { text: 'Votre réponse a été acceptée comme solution sur « Erreur de déploiement CAP ».', time: 'Il y a 1 h', category: 'Réponse acceptée', unread: true },
      { text: 'Ines Chaabane vous a mentionné dans une réponse.', time: 'Il y a 2 h', category: 'Mention', unread: true },
      { text: 'Nouvelle documentation publiée dans le Sujet SAP BTP.', time: 'Il y a 3 h', category: 'Documentation', unread: false },
      { text: 'Badge « Contributeur Expert » débloqué.', time: 'Hier', category: 'Badge', unread: false },
      { text: 'Nadia Ferchichi a publié dans la room Migration HANA Cloud.', time: 'Hier', category: 'Room', unread: false },
      { text: 'Certification « SAP BTP Associate » terminée.', time: 'Il y a 3 jours', category: 'Certification', unread: false },
      { text: 'Recommandation : article « Bonnes pratiques CI/CD » pourrait vous intéresser.', time: 'Il y a 5 jours', category: 'Recommandation', unread: false },
    ],
  };

  toggleTheme = () => this.setState(s => ({ theme: s.theme === 'light' ? 'dark' : 'light' }));
  toggleDashboardMenu = () => this.setState(s => ({ dashboardMenuOpen: !s.dashboardMenuOpen }));
  setDashboard = id => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('aymax_dashboard', id);
    this.setState({ dashboard: id, dashboardMenuOpen: false });
  };
  markAllRead = () => this.setState(s => ({ notifications: s.notifications.map(n => ({ ...n, unread: false })) }));

  renderVals() {
    const s = this.state;
    const isDark = s.theme === 'dark';
    const dashboardOptions = DASHBOARD_OPTIONS.map(d => ({ ...d, weight: d.id === s.dashboard ? 700 : 400, onClick: () => this.setDashboard(d.id) }));
    const dashboardLabel = (DASHBOARD_OPTIONS.find(d => d.id === s.dashboard) || DASHBOARD_OPTIONS[0]).label.replace('Tableau de bord ', '');
    const notifications = s.notifications.map(n => ({ ...n, bg: n.unread ? 'color-mix(in srgb, var(--color-accent) 6%, transparent)' : 'transparent' }));
    return {
      theme: s.theme, isDark, isLight: !isDark, toggleTheme: this.toggleTheme,
      dashboardMenuOpen: s.dashboardMenuOpen, toggleDashboardMenu: this.toggleDashboardMenu, dashboardOptions, dashboardLabel,
      notifications, markAllRead: this.markAllRead,
    };
  }
}
```
