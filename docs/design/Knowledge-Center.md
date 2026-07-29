# Design reference — Knowledge-Center

> **Centre de connaissances (liste + détail)**
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
      <input class="input" style="padding-left:34px;background:var(--color-bg);border-color:var(--color-divider)" placeholder="Rechercher dans le centre de connaissances…" value="{{ searchQuery }}" sc-camel-on-change="{{ setSearchQuery }}">
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
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
      <div style="font-family:var(--font-heading);font-weight:600;font-size:24px">Centre de connaissances</div>
      <sc-if value="{{ isIntern }}" hint-placeholder-val="{{ false }}">
        <button class="btn btn-secondary" disabled="{{ true }}" title="Les stagiaires ne peuvent pas publier de contenu dans le Centre de connaissances">Contribuer</button>
      </sc-if>
      <sc-if value="{{ isNotIntern }}" hint-placeholder-val="{{ true }}">
        <button class="btn btn-primary" sc-camel-on-click="{{ openCreate }}">Contribuer</button>
      </sc-if>
    </div>
    <sc-if value="{{ isIntern }}" hint-placeholder-val="{{ false }}">
      <div class="card elev-sm" style="padding:12px 16px;flex-direction:row;align-items:center;gap:10px;border-color:var(--color-accent);background:color-mix(in srgb, var(--color-accent) 8%, transparent)">
        <!-- icon -->
        <div style="font-size:12.5px">En tant que stagiaire, vous pouvez consulter le Centre de connaissances mais ne pouvez pas y publier d'articles, de documentation ou de bonnes pratiques.</div>
      </div>
    </sc-if>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <sc-for list="{{ categoryTabs }}" as="cat" hint-placeholder-count="8">
        <button class="btn {{ cat.btnClass }}" sc-camel-on-click="{{ cat.onClick }}">{{ cat.label }} <span style="opacity:.6;margin-left:4px">{{ cat.count }}</span></button>
      </sc-for>
    </div>
    <sc-if value="{{ listView }}" hint-placeholder-val="{{ true }}">
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px">
      <sc-for list="{{ items }}" as="it" hint-placeholder-count="6">
        <article class="card blueprint elev-sm" style="padding:18px;gap:10px;cursor:pointer" sc-camel-on-click="{{ it.onOpen }}">
          <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <span class="tag tag-outline">{{ it.category }}</span>
            <div style="display:flex;align-items:center;gap:6px">
              <sc-if value="{{ it.showStatus }}" hint-placeholder-val="{{ false }}">
                <span class="tag {{ it.statusTagClass }}" title="Visible par vous en tant qu'auteur">{{ it.statusLabel }}</span>
              </sc-if>
              <sc-if value="{{ it.fromQuestion }}" hint-placeholder-val="{{ false }}">
                <span title="Issu d'une question résolue" style="color:var(--color-accent-700)">
                  <!-- icon -->
                </span>
              </sc-if>
            </div>
          </div>
          <div class="card-title" style="font-size:17px">{{ it.title }}</div>
          <div class="card-body" style="font-size:13px;opacity:.75;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical">{{ it.excerpt }}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span class="tag tag-accent">{{ it.topic }}</span>
            <sc-for list="{{ it.tags }}" as="tg" hint-placeholder-count="2"><span class="tag tag-neutral">{{ tg }}</span></sc-for>
          </div>
          <div class="card-meta" style="display:flex;align-items:center;justify-content:space-between;font-size:11px;opacity:.6;margin-top:4px">
            <div style="display:flex;align-items:center;gap:-4px">
              <sc-for list="{{ it.contributors }}" as="ct" hint-placeholder-count="2">
                <div style="width:22px;height:22px;border-radius:50%;background:{{ ct.avatarColor }};color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:600;font-size:9px;margin-right:-6px;border:2px solid var(--color-bg)">{{ ct.initials }}</div>
              </sc-for>
              <span style="margin-left:10px">{{ it.contributorsLabel }}</span>
            </div>
            <span>{{ it.updated }}</span>
          </div>
        </article>
      </sc-for>
    </div>
    </sc-if>
    <sc-if value="{{ detailView }}" hint-placeholder-val="{{ false }}">
      <button class="btn btn-ghost" style="align-self:flex-start" sc-camel-on-click="{{ closeDetail }}">← Retour au Centre de connaissances</button>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:20px">
        <article class="card blueprint elev-sm" style="padding:24px;gap:14px">
          <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <span class="tag tag-outline">{{ activeItem.category }}</span>
              <span class="tag tag-accent">{{ activeItem.topic }}</span>
              <sc-for list="{{ activeItem.tags }}" as="tg" hint-placeholder-count="2"><span class="tag tag-neutral">{{ tg }}</span></sc-for>
            </div>
            <sc-if value="{{ activeItem.showStatus }}" hint-placeholder-val="{{ false }}">
              <span class="tag {{ activeItem.statusTagClass }}">{{ activeItem.statusLabel }}</span>
            </sc-if>
          </div>
          <div style="font-family:var(--font-heading);font-weight:600;font-size:26px;line-height:1.2">{{ activeItem.title }}</div>
          <div style="font-size:12px;opacity:.6">Par {{ activeItem.contributorsLabel }} · publié {{ activeItem.updated }}</div>
          <div style="font-size:14.5px;line-height:1.75">{{ activeItem.fullContent }}</div>
          <sc-if value="{{ activeItem.hasAttachment }}" hint-placeholder-val="{{ false }}">
            <div class="blueprint" style="display:flex;align-items:center;gap:12px;padding:12px 14px">
              <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
              <!-- icon -->
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:500">{{ activeItem.attachmentName }}</div>
                <div style="font-size:11px;opacity:.55">{{ activeItem.attachmentMeta }}</div>
              </div>
              <button class="btn btn-secondary" style="font-size:12px">
                <!-- icon -->
                Télécharger
              </button>
            </div>
          </sc-if>
          <div class="hr" style="margin:0"></div>
          <div class="card-kicker">Commentaires</div>
          <sc-for list="{{ activeItem.comments }}" as="c" hint-placeholder-count="2">
            <div style="display:flex;gap:10px">
              <div style="width:28px;height:28px;border-radius:50%;background:{{ c.avatarColor }};color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:600;font-size:10px;flex:none">{{ c.initials }}</div>
              <div style="flex:1;background:var(--color-surface);padding:8px 12px">
                <div style="font-size:12.5px;font-weight:600">{{ c.author }} <span style="font-weight:400;opacity:.5;font-size:11px">· {{ c.time }}</span></div>
                <div style="font-size:13px;margin-top:2px">{{ c.text }}</div>
              </div>
            </div>
          </sc-for>
          <div style="display:flex;gap:10px;align-items:center">
            <div style="width:28px;height:28px;border-radius:50%;background:var(--color-accent-700);color:var(--color-bg);display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:600;font-size:10px;flex:none">SB</div>
            <input class="input" style="min-height:32px" placeholder="Ajouter un commentaire…" value="{{ newCommentText }}" sc-camel-on-change="{{ setNewCommentText }}">
            <button class="btn btn-primary" style="font-size:12px" sc-camel-on-click="{{ submitComment }}">Envoyer</button>
          </div>
        </article>
        <aside style="display:flex;flex-direction:column;gap:16px;min-width:0">
          <div class="card elev-sm" style="padding:14px">
            <div class="card-kicker">Contributeurs</div>
            <sc-for list="{{ activeItem.contributors }}" as="ct" hint-placeholder-count="2">
              <div style="display:flex;align-items:center;gap:8px;padding:6px 0">
                <div style="width:26px;height:26px;border-radius:50%;background:{{ ct.avatarColor }};color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:600;font-size:10px;flex:none">{{ ct.initials }}</div>
                <span style="font-size:12.5px">{{ ct.name }}</span>
              </div>
            </sc-for>
          </div>
          <div class="card elev-sm" style="padding:14px">
            <div class="card-kicker">Documents liés</div>
            <sc-for list="{{ activeItem.relatedDocs }}" as="rd" hint-placeholder-count="2">
              <div style="padding:6px 0;font-size:12.5px;cursor:pointer;color:var(--color-accent-700)" sc-camel-on-click="{{ rd.onOpen }}">{{ rd.title }}</div>
            </sc-for>
          </div>
        </aside>
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
    theme: 'light', searchQuery: '', activeCategory: 'toutes', detailId: null, newCommentText: '',
    items: [
      { id: 1, category: 'Articles', title: 'Standardiser l\u2019authentification des micro-services CAP avec JWT + OAuth2', excerpt: 'Bonne pratique adoptée sur le projet Portail Client pour remplacer les clés API statiques par un flux OAuth2 avec rotation de token.',
        fullContent: "Sur le projet Portail Client, l'authentification inter-services reposait historiquement sur des clés API statiques échangées entre micro-services CAP. Ce mécanisme posait deux problèmes : une rotation manuelle fastidieuse et une surface d'attaque élevée en cas de fuite. Nous avons migré vers un flux OAuth2 client-credentials avec des tokens JWT à courte durée de vie, validés via le service XSUAA de SAP BTP. Chaque micro-service déclare ses scopes requis dans xs-security.json, et le binding XSUAA est injecté automatiquement au déploiement. Résultat : rotation automatique des credentials, traçabilité fine des appels via les claims du token, et suppression totale des clés statiques en configuration.",
        topic: 'Développement Digital', tags: ['CAP', 'OAuth', 'JWT'], contributors: [{ initials: 'KT', avatarColor: '#7e9cb8', name: 'Karim Trabelsi' }], contributorsLabel: 'Karim Trabelsi', updated: 'Il y a 1 jour', fromQuestion: false,
        hasAttachment: true, attachmentName: 'Guide-Authentification-JWT-OAuth2.pdf', attachmentMeta: 'PDF · 1.2 Mo',
        comments: [{ author: 'Sami Ben Youssef', initials: 'SB', avatarColor: '#749dc4', time: 'Il y a 20 h', text: 'Très utile, on va appliquer ça sur le module facturation.' }],
        relatedDocs: [{ id: 3, title: 'Erreur de déploiement CAP sur Cloud Foundry : "xsuaa binding not found"' }] },
      { id: 2, category: 'Documentation', title: 'Guide de paramétrage des vues CDS pour la migration HANA Cloud', excerpt: 'Pièges à éviter et check-list de paramétrage rassemblés après le retour d\u2019expérience de la migration HANA Cloud.',
        fullContent: "Cette documentation rassemble la check-list de paramétrage validée pendant la migration vers SAP HANA Cloud. Points clés : toujours annoter les vues CDS analytiques avec @Analytics.query: true pour déléguer l'agrégation côté base plutôt que côté service OData ; vérifier la compatibilité des types de données legacy (DEC, CURR) avec les types natifs HANA Cloud ; et valider les indices de performance sur les vues de plus de 500k lignes avant bascule en production. Un tableau récapitulatif des erreurs fréquentes et leur résolution est inclus en annexe.",
        topic: 'SAP BTP', tags: ['HANA', 'CDS'], contributors: [{ initials: 'NF', avatarColor: '#597ea3', name: 'Nadia Ferchichi' }], contributorsLabel: 'Nadia Ferchichi', updated: 'Il y a 2 h', fromQuestion: false,
        hasAttachment: true, attachmentName: 'Guide-Parametrage-CDS-HANA-Cloud.pdf', attachmentMeta: 'PDF · 3.1 Mo',
        comments: [], relatedDocs: [{ id: 6, title: 'Bilan de performance — migration vers SAP HANA Cloud (T2 2026)' }] },
      { id: 3, category: 'Questions résolues', title: 'Erreur de déploiement CAP sur Cloud Foundry : "xsuaa binding not found"', excerpt: 'Solution validée : vérifier l\u2019ordre de binding dans mta.yaml et l\u2019emplacement de xs-security.json.',
        fullContent: "Question résolue, promue automatiquement au Centre de connaissances. Le souci venait de l'ordre de binding dans mta.yaml : le module doit référencer le service xsuaa via requires, et déclarer le chemin vers xs-security.json dans build-parameters. Le fichier doit être à la racine du module CAP ; un redéploiement avec mbt build --mode=verbose permet de confirmer le binding. Un second cas a également été observé quand le plan du service xsuaa (application vs broker) ne correspondait pas à celui attendu par le module.",
        topic: 'SAP BTP', tags: ['CAP', 'Cloud Foundry'], contributors: [{ initials: 'KT', avatarColor: '#7e9cb8', name: 'Karim Trabelsi' }, { initials: 'YG', avatarColor: '#749dc4', name: 'Yassine Gharbi' }], contributorsLabel: 'Karim T., Yassine G.', updated: 'Il y a 2 h', fromQuestion: true,
        hasAttachment: false, comments: [], relatedDocs: [{ id: 1, title: 'Standardiser l\u2019authentification des micro-services CAP avec JWT + OAuth2' }] },
      { id: 4, category: 'Bonnes pratiques', title: 'Réduire le poids des images Docker de build en pipeline CI/CD', excerpt: 'Retour d\u2019expérience sur l\u2019optimisation multi-stage et le nettoyage des couches intermédiaires.',
        fullContent: "Nos images de build dépassaient 2 Go, ralentissant les déploiements en environnement de recette. La bonne pratique retenue : Dockerfile multi-stage avec un stage builder distinct du stage runtime final, minimisation des couches via un seul RUN combiné pour les installations, utilisation d'images de base -slim ou -alpine, et nettoyage systématique du cache des gestionnaires de paquets dans la même couche que l'installation. Résultat mesuré : images finales réduites de 2.3 Go à 480 Mo en moyenne.",
        topic: 'Développement Digital', tags: ['Docker', 'CI/CD'], contributors: [{ initials: 'KT', avatarColor: '#7e9cb8', name: 'Karim Trabelsi' }], contributorsLabel: 'Karim Trabelsi', updated: 'Il y a 3 jours', fromQuestion: false,
        hasAttachment: false, comments: [], relatedDocs: [] },
      { id: 5, category: 'Modèles', title: 'Gabarit Fiori Elements — liste analytique + carte de synthèse', excerpt: 'Modèle prêt à l\u2019emploi pour accélérer les écrans de reporting finance et logistique.',
        fullContent: "Ce gabarit fournit une base réutilisable combinant une vue liste analytique (List Report) et une carte de synthèse (Object Page en mode Analytical) pour les écrans de reporting. Il inclut les annotations UI.LineItem, UI.Chart et UI.SelectionFields pré-configurées, ainsi qu'un jeu de filtres standards (période, département, statut). Les équipes finance et logistique peuvent le dupliquer et l'adapter à leur propre entité CDS en moins d'une journée.",
        topic: 'Solutions SAP', tags: ['SAP Fiori', 'Reporting'], contributors: [{ initials: 'IC', avatarColor: '#416180', name: 'Ines Chaabane' }], contributorsLabel: 'Ines Chaabane', updated: 'Il y a 2 jours', fromQuestion: false,
        hasAttachment: true, attachmentName: 'Gabarit-Fiori-Elements-Reporting.pptx', attachmentMeta: 'PPTX · 5.1 Mo', comments: [], relatedDocs: [] },
      { id: 6, category: 'Rapports', title: 'Bilan de performance — migration vers SAP HANA Cloud (T2 2026)', excerpt: 'Gains mesurés : 34% sur les temps de traitement batch, simplification du paysage d\u2019intégration.',
        fullContent: "Ce rapport présente les résultats mesurés suite à la migration du paysage SAP vers SAP HANA Cloud au T2 2026 : gain de 34% sur les temps de traitement batch, réduction de 40% du nombre de systèmes d'intégration intermédiaires, et diminution notable des tickets d'incident liés à la volumétrie. Le rapport détaille la méthodologie de mesure, les jeux de données de référence utilisés, et les recommandations pour les prochains lots de migration.",
        topic: 'SAP BTP', tags: ['HANA', 'Performance'], contributors: [{ initials: 'NF', avatarColor: '#597ea3', name: 'Nadia Ferchichi' }], contributorsLabel: 'Nadia Ferchichi', updated: 'Il y a 2 h', fromQuestion: false,
        hasAttachment: true, attachmentName: 'Bilan-Performance-HANA-Cloud-T2-2026.pdf', attachmentMeta: 'PDF · 2.8 Mo', comments: [], relatedDocs: [{ id: 2, title: 'Guide de paramétrage des vues CDS pour la migration HANA Cloud' }] },
      { id: 7, category: 'Tutoriels', title: 'Exposer une vue CDS analytique en OData V4 avec pagination performante', excerpt: 'Pas à pas pour annoter une vue CDS avec @Analytics.query et déléguer l\u2019agrégation à HANA.',
        fullContent: "Tutoriel pas à pas : 1) Créer la vue CDS analytique avec les dimensions et mesures requises. 2) Ajouter l'annotation @Analytics.query: true pour déléguer l'agrégation côté HANA. 3) Exposer la vue via un service OData V4 avec pagination server-driven ($top/$skip). 4) Configurer le cache de résultats pour les requêtes fréquentes. 5) Valider les temps de réponse sur un jeu de données représentatif avant mise en production.",
        topic: 'Solutions SAP', tags: ['HANA', 'OData'], contributors: [{ initials: 'NF', avatarColor: '#597ea3', name: 'Nadia Ferchichi' }], contributorsLabel: 'Nadia Ferchichi', updated: 'Il y a 20 h', fromQuestion: false,
        hasAttachment: false, comments: [], relatedDocs: [] },
      { id: 8, category: 'FAQ', title: 'Questions fréquentes sur l\u2019accès aux environnements SAP BTP', excerpt: 'Comment demander un accès, quels rôles requérir, délais habituels de provisionnement.',
        fullContent: "Q : Comment demander un accès à un environnement SAP BTP ? R : Via une demande au portail interne IT, en précisant le projet et le rôle requis. Q : Quels rôles existent ? R : Viewer, Developer, Space Manager, Org Manager. Q : Quel est le délai habituel ? R : 24 à 48h ouvrées après validation du manager. Q : Que faire en cas d'accès refusé ? R : Contacter l'équipe plateforme via la room dédiée.",
        topic: 'SAP BTP', tags: ['SAP BTP'], contributors: [{ initials: 'SB', avatarColor: '#749dc4', name: 'Sami Ben Youssef' }], contributorsLabel: 'Sami Ben Youssef', updated: 'Il y a 5 jours', fromQuestion: false, status: 'approved', ownedByMe: true,
        hasAttachment: false, comments: [], relatedDocs: [] },
      { id: 9, category: 'Article', title: 'Comparatif interne des frameworks front-end pour nos portails clients', excerpt: 'Brouillon en cours de relecture : comparaison Angular/React pour les futurs portails, encore à compléter.',
        fullContent: "Brouillon en cours : comparatif Angular vs React pour nos futurs portails clients, sur les critères de maintenabilité, écosystème de composants internes réutilisables, et courbe d'apprentissage pour l'équipe. Analyse encore incomplète — sections performance et accessibilité à compléter avant soumission.",
        topic: 'Développement Digital', tags: ['Angular'], contributors: [{ initials: 'SB', avatarColor: '#749dc4', name: 'Sami Ben Youssef' }], contributorsLabel: 'Sami Ben Youssef', updated: 'Il y a 1 h', fromQuestion: false, status: 'draft', ownedByMe: true,
        hasAttachment: false, comments: [], relatedDocs: [] },
      { id: 10, category: 'Rapport', title: 'Rapport de fin de mission — refonte du portail RH interne', excerpt: 'En attente de relecture par le manager avant publication dans le Centre de connaissances.',
        fullContent: "Rapport de fin de mission sur la refonte du portail RH interne : périmètre couvert, choix techniques (SAP Fiori Elements côté front, CAP côté service), retours utilisateurs recueillis en phase pilote, et recommandations pour la phase 2. En attente de relecture managériale avant publication définitive.",
        topic: 'Solutions SAP', tags: ['SAP Fiori'], contributors: [{ initials: 'SB', avatarColor: '#749dc4', name: 'Sami Ben Youssef' }], contributorsLabel: 'Sami Ben Youssef', updated: 'Il y a 3 h', fromQuestion: false, status: 'pending', ownedByMe: true,
        hasAttachment: false, comments: [], relatedDocs: [] },
    ],
  };

  toggleTheme = () => this.setState(s => ({ theme: s.theme === 'light' ? 'dark' : 'light' }));
  toggleDashboardMenu = () => this.setState(s => ({ dashboardMenuOpen: !s.dashboardMenuOpen }));
  setDashboard = id => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('aymax_dashboard', id);
    this.setState({ dashboard: id, dashboardMenuOpen: false });
  };
  setSearchQuery = e => this.setState({ searchQuery: e.target.value });
  setCategory = c => this.setState({ activeCategory: c });
  openCreate = () => {};
  openDetail = id => this.setState({ detailId: id, newCommentText: '' });
  closeDetail = () => this.setState({ detailId: null });
  setNewCommentText = e => this.setState({ newCommentText: e.target.value });
  submitComment = () => {
    const text = this.state.newCommentText.trim();
    if (!text) return;
    this.setState(s => ({
      items: s.items.map(it => it.id !== s.detailId ? it : { ...it, comments: [...it.comments, { author: 'Sami Ben Youssef', initials: 'SB', avatarColor: '#749dc4', time: "À l'instant", text }] }),
      newCommentText: '',
    }));
  };

  renderVals() {
    const s = this.state;
    const isDark = s.theme === 'dark';
    const dashboardOptions = DASHBOARD_OPTIONS.map(d => ({ ...d, weight: d.id === s.dashboard ? 700 : 400, onClick: () => this.setDashboard(d.id) }));
    const dashboardLabel = (DASHBOARD_OPTIONS.find(d => d.id === s.dashboard) || DASHBOARD_OPTIONS[0]).label.replace('Tableau de bord ', '');

    const categories = ['toutes', 'Articles', 'Documentation', 'Rapports', 'Tutoriels', 'Bonnes pratiques', 'Questions résolues', 'FAQ', 'Modèles'];
    const categoryTabs = categories.map(c => ({
      label: c === 'toutes' ? 'Tout' : c,
      count: c === 'toutes' ? s.items.length : s.items.filter(i => i.category === c).length,
      btnClass: s.activeCategory === c ? 'btn-primary' : 'btn-secondary',
      onClick: () => this.setCategory(c),
    }));

    let items = s.activeCategory === 'toutes' ? s.items : s.items.filter(i => i.category === s.activeCategory);
    if (s.searchQuery.trim()) {
      const q = s.searchQuery.toLowerCase();
      items = items.filter(i => i.title.toLowerCase().includes(q) || i.excerpt.toLowerCase().includes(q) || i.tags.some(t => t.toLowerCase().includes(q)));
    }

    const statusMeta = {
      draft: { label: 'Brouillon', cls: 'tag-neutral' },
      pending: { label: 'En attente', cls: 'tag-pending' },
      approved: { label: 'Approuvé', cls: 'tag-completed' },
      rejected: { label: 'Rejeté', cls: 'tag-error' },
    };
    items = items.map(it => ({
      ...it,
      showStatus: !!it.ownedByMe && !!it.status,
      statusLabel: it.status ? statusMeta[it.status].label : '',
      statusTagClass: it.status ? statusMeta[it.status].cls : '',
      onOpen: () => this.openDetail(it.id),
    }));

    let activeItem = null;
    if (s.detailId) {
      const it = s.items.find(x => x.id === s.detailId);
      if (it) {
        activeItem = {
          ...it,
          showStatus: !!it.ownedByMe && !!it.status,
          statusLabel: it.status ? statusMeta[it.status].label : '',
          statusTagClass: it.status ? statusMeta[it.status].cls : '',
          contributors: it.contributors.map(c => ({ ...c, name: c.name || c.initials })),
          relatedDocs: (it.relatedDocs || []).map(rd => ({ ...rd, onOpen: () => this.openDetail(rd.id) })),
        };
      }
    }

    return {
      theme: s.theme, isDark, isLight: !isDark, toggleTheme: this.toggleTheme,
      dashboardMenuOpen: s.dashboardMenuOpen, toggleDashboardMenu: this.toggleDashboardMenu, dashboardOptions, dashboardLabel,
      searchQuery: s.searchQuery, setSearchQuery: this.setSearchQuery,
      categoryTabs, items, openCreate: this.openCreate,
      isIntern: s.dashboard === 'intern', isNotIntern: s.dashboard !== 'intern',
      listView: !s.detailId, detailView: !!s.detailId, closeDetail: this.closeDetail, activeItem,
      newCommentText: s.newCommentText, setNewCommentText: this.setNewCommentText, submitComment: this.submitComment,
    };
  }
}
```
