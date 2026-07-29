# AYMAX Knowledge Hub — LOT 2 Architecture & Analysis

**Author:** Sami (intern, Lot 2)
**Date:** 29 July 2026
**Status:** Analysis & design — **no code yet**, pending your validation
**Scope:** Search, Search Standalone, Experts, Knowledge Center, Notifications, User Profile, Dashboard

---

## 0. Read this first — safety rules for a shared BTP account

You told me the BTP account belongs to your supervisor and holds sensitive projects on other subaccounts and dev spaces. Before any command in this project, these are non-negotiable.

### 0.1 Commands that must NEVER be run

| Command | Why it is dangerous |
|---|---|
| `cf delete-service <name>` | Deletes an HDI container or XSUAA instance — **destroys the database**, possibly someone else's |
| `cf undeploy <mta-id> --delete-services` | Same, but silently, for every resource in the MTA |
| `cf delete-space` / `cf delete-org` | Removes an entire dev space |
| `cds deploy --to hana` | Runs a destructive HDI deploy from your laptop straight into a cloud container; can drop and recreate tables |
| `cf target -s <someone-else's-space>` followed by any deploy | Deploys your code over a colleague's space |
| `git push --force` on `main` | Rewrites history for all three of you |

### 0.2 The routine before any deploy

```bash
cf target                 # ALWAYS. Read org + space out loud before continuing.
cf spaces                 # Confirm you are in YOUR dev space, not "prod", not a supervisor space
cf services               # Confirm which service instances already exist in this space
```

If `cf target` shows anything other than your own dev space, stop and re-target. This single habit prevents 90% of the accidents that happen on shared accounts.

### 0.3 Develop locally, deploy rarely

For the entire development phase of Lot 2 you do **not** need to touch BTP at all:

```bash
npm install
cds watch                 # starts CAP with an in-memory SQLite DB, serves app/ statically
```

CAP falls back to SQLite locally (the repo already has `@cap-js/sqlite` in devDependencies). Your data, your machine, zero cloud risk. Deploy to your dev space only at milestones, and only after `cf target`.

### 0.4 Git hygiene for a three-person repo

The repo currently has one commit and one branch. Propose to the team:

- `main` is protected — never commit directly, never force-push.
- Every task lives on `feature/lot2-<module>` (e.g. `feature/lot2-notifications`).
- Merge via Pull Request, so the other two can see schema changes before they land.
- `SAP-Basis-knowledge-center.zip` and `.tar.gz` are committed at the repo root. Those are build artefacts — they should be deleted and added to `.gitignore`. Ask your colleague before deleting: they may have committed them by accident and not realise.

---

## 1. Where the project actually stands today

Before designing anything, I read your colleague's Lot 1 code. **This matters more than the spec**, because it sets the conventions you must follow for the three lots to merge cleanly.

### 1.1 What exists

```
SAP-Basis-knowledge-center/
├── db/schema.cds                    ← ONE shared file: UserProfiles, Rooms, Posts,
│                                       Tags, PostTags, Comments, Likes,
│                                       PostDocuments, Follows
├── srv/
│   ├── feed-service.cds             ← @path: '/odata/v4/feed'
│   ├── feed-service.js              ← 3 lines: wires the handler class
│   └── handlers/FeedHandler.js      ← class FeedHandler extends cds.ApplicationService
├── app/feed/webapp/                 ← freestyle SAPUI5 (NOT Fiori Elements)
│   ├── manifest.json                ← sap.app.id = "aymax.feed", OData V4
│   ├── Component.js
│   ├── view/Feed.view.xml           ← sap.f.DynamicPage + 3-column layout
│   ├── controller/Feed.controller.js
│   ├── i18n/i18n.properties
│   └── css/style.css
├── mta.yaml                         ← srv module + hdb deployer + xsuaa + hana
├── xs-security.json                 ← ⚠️ EMPTY: no scopes, no roles, no attributes
└── package.json                     ← ESM ("type":"module"), CDS 10, @sap/xssec 4
```

### 1.2 Conventions you must inherit

| Convention | Value | Consequence for you |
|---|---|---|
| Namespace | `aymax.knowledgehub` | All your entities go in the same namespace |
| Module system | ESM (`"type": "module"`) | Use `import`/`export`, **never** `require()` |
| Service naming | `srv/<name>-service.cds` + `.js` + `handlers/<Name>Handler.js` | Follow exactly |
| Service path | `@path: '/odata/v4/<name>'` | Yours: `/odata/v4/knowledge`, `/odata/v4/people`, etc. |
| Handler style | `class X extends cds.ApplicationService`, `async init()`, private methods `_doThing` | Follow exactly |
| UI5 flavour | Freestyle (XML views + JS controllers), **not** Fiori Elements | Your apps must be freestyle too |
| UI5 app id | `aymax.<module>` under `app/<module>/webapp/` | Yours: `aymax.knowledge`, `aymax.experts`, … |
| OData version | V4 | Use V4 syntax everywhere |
| UI5 minVersion | 1.120.0 | Controls newer than 1.120 are off-limits |
| Language | French UI strings | Keep French, but put them in `i18n.properties` (see below) |

### 1.3 Three things Lot 1 got right — copy these

1. **Denormalised counters.** `Posts.likeCount` is stored, not computed on read. Correct for a feed that is read far more often than written.
2. **No N+1 queries.** `_enrichPosts` fetches all the current user's likes in *one* query and builds a `Set`, instead of querying per post. This is the single most common performance mistake in CAP handlers. Copy the pattern.
3. **Auto-provisioning of `UserProfiles`.** On first write, the profile row is created from XSUAA token attributes. You will reuse this for Experts/Profile — but you'll need it on *read* too, not just on write (see §4.5).

### 1.4 Four things that are gaps — and three of them are yours

| Gap | Owner | Severity |
|---|---|---|
| `xs-security.json` is empty → **no roles, no scopes, RBAC does not exist** | Shared, but you need it most (Dashboard is role-driven) | 🔴 Blocking |
| `db/schema.cds` is one monolithic file → guaranteed merge conflicts between 3 devs | Team decision | 🟠 High |
| No approuter / `html5-apps-repo` module in `mta.yaml` → UI5 apps are not deployable to BTP yet | Team, later | 🟡 Medium |
| French strings hardcoded in `Feed.view.xml` instead of `i18n.properties` | Lot 1 | 🟡 Low — but **do not copy this**; use i18n from day one in your views |

---

## 2. Where the spec and the design contradict each other

You asked me to flag inconsistencies and ask which is the source of truth before generating code. There are seven, and four of them directly change what you build.

### 🔴 C1 — "Rooms" means two different things

- **Design:** `Rooms.html` = collaborative project spaces with members and activity ("Migration HANA Cloud — 12 membres"). Separately, `Topics.html` = *Sujets* (SAP BTP, Développement Digital), and `Tags.html` = tags.
- **Colleague's schema:** one entity `Rooms` with the comment *"ROOMS / SUJETS (ex: SAP BTP, Développement Digital…)"* — it merges Rooms **and** Topics into a single table.
- **Cahier des charges:** has a `TOPICS` table, and the use-case diagram has "Participer à une Room" and "Gérer les Rooms" as separate use cases.

**Impact on you:** Search must return `Room`, `Sujet` and `Tag` as three distinct result types (the design's Search page literally does). Knowledge Center items carry a `topic` *and* a list of `tags`. If Rooms and Topics stay merged, your search results and your KC filters will be wrong.

**My recommendation:** split into three entities — `Rooms` (collaboration spaces), `Topics` (knowledge taxonomy), `Tags` (free labels). **This is a change to your colleague's file, so it must be agreed with him and the team, not done unilaterally.**

### 🔴 C2 — Gamification exists in the design but not in the spec

The design is built around reputation points, badges, expertise levels (`Débutant → Contributeur → Expert → Spécialiste → Master`), star ratings per skill, certifications and a rewards catalogue. **The cahier des charges mentions none of this** — its `USERS` table has no reputation field and there is no `BADGES` table.

Three of your seven modules (Experts, Profile, Dashboard) are *mostly* gamification. This is not a minor gap; it's roughly 40% of your lot.

**Question for you:** is the design authoritative here, or is gamification out of scope for the internship? I've designed for "design is authoritative" below, but I need confirmation before writing entities.

### 🟠 C3 — "Troubleshooting / Issues" vs "Questions"

- **Spec §4.4** describes a troubleshooting module with an `ISSUES` table: problems, symptoms, causes, solutions, severity, assignment.
- **Design** has `Questions.html`: a Stack-Overflow-style Q&A with votes, accepted answers, and tags — a different data model and a different workflow.

They are not the same thing. The design has no `severity` or `assignation` field anywhere; the spec's screenshot for §6.5 "Liste des problèmes" is actually the Questions page.

**Impact on you:** the Knowledge Center has a category "Questions résolues" with a `fromQuestion: true` flag — solved questions get promoted into the KC. So you depend on whichever entity wins. If it's `Issues`, your promotion logic reads from `Issues`; if it's `Questions`, from `Questions`.

### 🟠 C4 — Search: keyword vs semantic

- **Spec §4.6 + §7.8** require AI semantic search, similar-article suggestions, and the HANA Vector Engine.
- **Design's Search page** is a plain multi-type keyword search with facet tabs. No "similar articles", no relevance score shown.

**My recommendation:** build keyword search now (phase 1) behind an interface that vector search can slot into later (phase 2). §7.3 shows how. But confirm whether semantic search is expected as a deliverable for the internship or is "target solution" scope.

### 🟡 C5 — Confidentiality classification is in the spec only

Spec §4.2 requires filtering by *confidentialité*, and §4.6 requires ranking results "selon pertinence **et confidentialité**". AI Security Guardian assigns a confidentiality level. **No design screen shows a confidentiality badge or filter.**

**Impact on you:** this is directly your problem — Search and Knowledge Center must both respect classification. If it's in scope, every `KnowledgeItem` needs a `confidentiality` field and your read restrictions must filter on it. I've included it as optional in §6.

### 🟡 C6 — AI Security Guardian has no UI in the design export

It's the flagship innovation of the spec (an entire section, §7) but there is no screen for it in the 21 exported pages. Spec §6.7's figure is actually the "Poser une question" modal — the wrong screenshot was pasted (the same wrong screenshot appears again under §6.8 Dashboard RH).

Not your lot, but it affects you: if the Guardian gates publication, then a Knowledge Center item can be blocked at submit time, and that produces a **notification** — which *is* your lot.

### 🟡 C7 — The Dashboard role switcher is a prototype device, not a feature

In the design, every page has a dropdown (Employé / Manager / RH / Admin / Stagiaire) that writes to `localStorage.aymax_dashboard`. That is how the designer demoed five roles in one static prototype.

**Do not implement this as a feature.** In production the role comes from the XSUAA token. See §8.7 — this is the single biggest beginner trap in your lot.

---

## 3. Lot 2 analysis

### 3.1 Responsibilities

| Module | One-line responsibility | Complexity | Depends on other lots? |
|---|---|---|---|
| **Notifications** | Deliver, list and mark-as-read per-user events | Low | Receives events *from* everyone |
| **User Profile** | The current user's own identity, score, activity, certifications | Medium | Reads Lot 1 posts, Lot 3 questions |
| **Experts** | Directory + public profile of *other* users, by expertise | Medium | Same data as Profile |
| **Knowledge Center** | Curated content library: articles, docs, reports, tutorials, FAQ, templates | **High** | Validation workflow (Lot 3), promoted questions (Lot 3) |
| **Search** | One query → results across every content type | **High** | Reads *every* lot's tables |
| **Search Standalone** | The full-page search results view (same backend, own route) | Low | — |
| **Dashboard** | Role-specific aggregate landing page, 5 variants | **High** | Aggregates *everything* |

### 3.2 Dependency graph

```
                    ┌───────────────────────────────────┐
                    │  UserProfiles  (Lot 1 owns file,  │
                    │  you extend it heavily)           │
                    └───────────────┬───────────────────┘
                                    │
          ┌─────────────────────────┼──────────────────────┐
          ▼                         ▼                      ▼
   ┌────────────┐          ┌────────────────┐      ┌──────────────┐
   │  Profile   │          │    Experts     │      │Notifications │
   │  (self)    │          │   (others)     │      │              │
   └──────┬─────┘          └────────┬───────┘      └──────▲───────┘
          │  shared reputation/     │                     │ events
          │  badge/skill components │                     │ from all lots
          └───────────┬─────────────┘                     │
                      ▼                                   │
             ┌──────────────────┐                         │
             │ Knowledge Center │─────────────────────────┘
             └────────┬─────────┘
                      │
                      ▼
              ┌───────────────┐        reads: Posts (L1), Questions (L3),
              │    Search     │◀────── Rooms (L3), Topics, Tags,
              └───────┬───────┘        KnowledgeItems (you), UserProfiles
                      │
                      ▼
              ┌───────────────┐        reads: literally everything
              │   Dashboard   │◀────── ⚠️ build LAST
              └───────────────┘
```

**Read this graph as: build bottom-up is wrong, build top-down is wrong. Build left-to-right along the arrows.** Notifications and Profile have almost no inbound dependencies; Dashboard has nothing but inbound dependencies.

### 3.3 Integration points — the four contracts you must negotiate with your team

These are the places where your code touches someone else's. Get them agreed **in writing (a PR, a wiki page, a WhatsApp message — anything durable)** before you write code, because changing them later means all three of you rework.

#### Contract A — `UserProfiles` extension (with Lot 1)

You need fields Lot 1 didn't add: skills, badges, certifications, reputation ledger. Two options:

- ❌ **Edit `UserProfiles` directly** in `db/schema.cds` → guaranteed merge conflict, and you'd own a table Lot 1 already writes to.
- ✅ **Use CDS `extend`** in your own file. This is exactly what `extend` is for:

```cds
// db/people.cds  ← YOUR file, no conflict with Lot 1
using { aymax.knowledgehub as kh } from './schema';

extend kh.UserProfiles with {
  bio            : String(1000);
  expertiseLevel : String(20);          // derived, cached
  skills         : Composition of many UserSkills   on skills.user  = $self;
  badges         : Composition of many UserBadges   on badges.user  = $self;
}
```

Lot 1's file is untouched. Git sees two independent files. **This is the single most useful CDS feature for multi-developer projects.**

#### Contract B — Comments on Knowledge Center items (with Lot 1)

Lot 1's `Comments` entity has `post : Association to Posts`. Your KC detail page also has a comment thread. Options:

- ❌ Create a second `KnowledgeComments` entity → duplicated logic, two comment UIs, two notification paths.
- ✅ `extend kh.Comments with { knowledgeItem : Association to KnowledgeItems; }` and make `post` optional. One entity, one comment component, one notification rule.

**Cost of this choice:** `Comments` now has two nullable foreign keys and needs a validation rule ("exactly one of `post`/`knowledgeItem` must be set"). That's a `before('CREATE')` check. Acceptable. **Requires Lot 1's agreement** since he owns comment creation.

#### Contract C — The notification publishing interface (with Lots 1 and 3)

Every lot needs to raise notifications. If all three of you `INSERT INTO Notifications` directly, you get three different payload shapes and no way to change the schema.

Instead you publish **one function** that they import:

```js
// srv/lib/notify.js  ← YOUR file, YOUR contract
export async function notify({ recipients, type, title, sourceType, sourceID, actorID }) { … }
```

They call `await notify({ recipients: [authorId], type: 'COMMENT_ADDED', … })`. You own the table, the schema, the dedup logic and the delivery. They own nothing but the call. This is dependency inversion — they depend on your *interface*, not your *table*.

Give them the list of valid `type` values up front (§6.4).

#### Contract D — Dashboard data providers (with Lots 1 and 3)

Your Manager dashboard needs "3 validations en attente" — that count lives in Lot 3's validation queue, which may not exist yet. Do **not** block on it. Define an interface and ship a mock implementation:

```js
// srv/dashboard/providers/ValidationProvider.js
export class MockValidationProvider  { async getPendingCount() { return 3; } }
export class RealValidationProvider  { async getPendingCount() { /* queries Lot 3 */ } }
```

Swap the binding when Lot 3 lands. Nothing else in your code changes. Keep a `TODO-INTEGRATION.md` listing every mock so nothing is forgotten at merge time.

### 3.4 Risks, ranked

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **RBAC bolted on at the end.** `xs-security.json` is empty; if you build 7 modules then add auth, you rewrite every handler. | High | 🔴 Critical | Define scopes in week 1. Test with mocked users locally from the first module. §8 Step 2. |
| R2 | **Merge conflicts in `db/schema.cds`.** Three devs, one file. | Very High | 🟠 High | Split into per-lot `.cds` files + `extend`. Propose to team now. §5.2 |
| R3 | **Prototype role switcher ships to production.** Anyone could set `localStorage` to `admin`. | Medium | 🔴 Critical | Role from `req.user.is()` server-side, always. Switcher only in local dev via mocked users. §8.7 |
| R4 | **Dashboard blocked by Lots 1 & 3.** | High | 🟠 High | Provider interfaces + mocks (Contract D). Build Dashboard last. |
| R5 | **Accidental damage to supervisor's BTP resources.** | Low | 🔴 Critical | §0. `cf target` every time. Local SQLite for development. |
| R6 | **Search too slow on HANA.** Cross-entity search without indexes degrades fast. | Medium | 🟠 High | Cap `$top`, index searchable columns, use HANA fuzzy search not `LIKE '%x%'`. §7.3 |
| R7 | **Reputation counters drift** from reality after failed writes. | Medium | 🟡 Medium | Store an immutable `ReputationEvents` ledger; the counter is a cache, recomputable. §6.3 |
| R8 | **Notifications table grows unbounded.** | Medium | 🟡 Medium | Retention policy: archive/delete read notifications >90 days. |
| R9 | **CAP draft (`@odata.draft.enabled`) confused with business status `draft`.** Lot 1 uses the former on `Posts`. | Medium | 🟠 High | For Knowledge Center use a **business status field**, not `@odata.draft.enabled`. §8.6 |
| R10 | **Scope creep from unresolved C1–C7.** | High | 🟠 High | Get §2 answered before coding. |

---

## 4. Functional decomposition, module by module

For each module: what the design actually shows, the pages, the reusable components, the backend services and the entities touched.

### 4.1 Search + Search Standalone

**What the design shows** (`Search.html`):
- Empty state: a heading, a subtitle listing the searchable types, and 6 clickable suggestion chips (`SAP BTP`, `CAP`, `HANA`, `Fiori Elements`, `JWT`, `Docker`).
- Results state: `"N résultats pour « query »"`, a row of facet buttons (`Tout 9`, `Questions 1`, `Articles 1`, …) with counts, then a flat result list.
- Each result card: type badge, meta line, title, excerpt.
- Nine result types: `Question`, `Article`, `Documentation`, `Expert`, `Room`, `Sujet`, `Tag`, `Publication`, `Certification`.
- The search input lives in the **global header**, present on every page.

**Pages**
| Page | Route | Notes |
|---|---|---|
| Search Standalone | `#/search?q=…&type=…` | Full-page results. Deep-linkable — `q` and `type` in the URL so results can be shared. |
| Header search field | — | Component embedded in the shell; on submit navigates to `#/search?q=…` |

**Reusable components (UI5 fragments)**
- `SearchResultItem.fragment.xml` — one result row, renders differently per `type` via a formatter
- `SearchFacetBar.fragment.xml` — the type tabs with counts
- `SearchSuggestions.fragment.xml` — the empty-state chips
- `GlobalSearchField.fragment.xml` — the header input (reused on all 7 of your pages)

**Backend**
- Service `SearchService` at `/odata/v4/search`
- Function `search(q, type, top, skip)` → `many SearchResult`
- Function `suggest(q)` → `many String` (type-ahead; phase 2)

**Entities touched:** none of its own. It *reads* `Posts`, `KnowledgeItems`, `Questions`, `Rooms`, `Topics`, `Tags`, `UserProfiles`, `UserCertifications`.

---

### 4.2 Experts

**What the design shows** (`Experts.html`):
- **List view:** department filter buttons (`Tous`, `Solutions SAP`, `Développement Digital`, `Gestion des données`), then a responsive card grid. Each card: avatar with initials + colour, name, position, department, badge chips, then a footer row `"2140 pts"` / `"64 contributions"`.
- **Detail view:** back button, then a two-column layout — left: large avatar, name, position, dept, bio, and two stats (Réputation / Badges). Right: three cards — **Expertise** (skill name, star string, progress bar with a percentage), **Badges** (chips), **Activité récente** (timeline entries with text + relative time).

**Pages**
| Page | Route |
|---|---|
| Experts list | `#/experts` |
| Expert detail | `#/experts/{userID}` |

**Reusable components** — note the overlap with Profile, this is where you save the most work:
- `ExpertCard.fragment.xml`
- `SkillList.fragment.xml` — **shared with Profile** (identical markup in both designs)
- `BadgeList.fragment.xml` — **shared with Profile**
- `ActivityTimeline.fragment.xml` — **shared with Profile**
- `UserAvatar.fragment.xml` — initials + deterministic colour; **shared across all 7 modules**

**Backend:** `PeopleService` at `/odata/v4/people`
- `GET /Experts?$filter=department eq '…'&$orderby=reputation desc`
- `GET /Experts('{id}')?$expand=skills,badges`
- `GET /Experts('{id}')/activity()`

**Entities:** `UserProfiles` (extended), `UserSkills`, `Badges`, `UserBadges`, `ReputationEvents`

---

### 4.3 Knowledge Center

The largest module in your lot. **Read the design data carefully — it encodes business rules.**

**What the design shows** (`Knowledge Center.html`):
- Header row: title + a `Contribuer` button that is **disabled with a tooltip when the user is an intern**, and a full accent-coloured banner explaining the restriction. This is an explicit RBAC rule baked into the design.
- Category tabs with live counts: `Tout`, `Articles`, `Documentation`, `Rapports`, `Tutoriels`, `Bonnes pratiques`, `Questions résolues`, `FAQ`, `Modèles`.
- Card grid. Each card: category chip, **status chip shown only when `ownedByMe && status`** (`Brouillon` / `En attente` / `Approuvé` / `Rejeté`), a check icon when `fromQuestion` is true, title, 3-line-clamped excerpt, topic chip + tag chips, overlapping contributor avatars + label, and a relative timestamp.
- **Detail view:** two columns. Left: chips, title, `Par {contributeurs} · publié {date}`, full content, an optional attachment row with filename/size/download, a divider, then the comment thread and a comment input. Right: a sidebar with **Contributeurs** and **Documents liés** (related items, clickable).

**Business rules the design gives you for free:**
1. Interns can read but not publish → server-side rule, not just a disabled button.
2. Draft/pending/rejected items are visible **only to their author** (and, implicitly, to managers who validate them) → this is *row-level* security, `@restrict … where`.
3. Items can be promoted from a solved question (`fromQuestion`) → integration with Lot 3.
4. Multiple contributors per item, not a single author.
5. Related documents are a curated many-to-many, not a computed "similar" list.

**Pages**
| Page | Route |
|---|---|
| Knowledge Center list | `#/knowledge` |
| Item detail | `#/knowledge/{id}` |
| Create / edit item | `#/knowledge/new`, `#/knowledge/{id}/edit` |

**Reusable components**
- `KnowledgeCard.fragment.xml`
- `StatusChip.fragment.xml` — status → label + semantic colour mapping
- `AttachmentRow.fragment.xml`
- `CommentThread.fragment.xml` — **coordinate with Lot 1**, he has the same thing on Posts
- `TagChipList.fragment.xml` — **shared with Search and Topics**
- `ContributorAvatarGroup.fragment.xml`

**Backend:** `KnowledgeService` at `/odata/v4/knowledge`
- CRUD on `KnowledgeItems`, restricted by role and by status
- `action submitForReview(id)` — draft → pending (and fires the Guardian hook later)
- `action addComment(itemID, content)`
- `action promoteQuestion(questionID)` — Lot 3 integration
- `function getRelated(itemID)`

**Entities:** `KnowledgeItems`, `KnowledgeItemTags`, `KnowledgeContributors`, `KnowledgeAttachments`, `KnowledgeRelations`, `Topics`, `Tags`, `Comments` (extended)

---

### 4.4 Notifications

**What the design shows** (`Notifications.html`):
- Title + `Tout marquer comme lu` button.
- A flat list, newest first. Each row: icon in a bordered square, text, `{time} · {category}`, and an accent dot when unread. Unread rows get a 6%-tint background.
- Eight categories observed: `Commentaire`, `Réponse acceptée`, `Mention`, `Documentation`, `Badge`, `Room`, `Certification`, `Recommandation`.
- The spec (§4.7) adds: validation alerts, publication notifications, update reminders, **security events** (from AI Security Guardian).

**Note:** there is **no unread counter in the header** in the design. Add one — `sap.f.ShellBar` has a `notificationsNumber` property built in, and users expect it.

**Pages**
| Page | Route |
|---|---|
| Notification list | `#/notifications` |
| Header popover | — | Last 5 + "Voir tout" |

**Reusable components**
- `NotificationListItem.fragment.xml` — but see §7.4, `sap.m.NotificationListItem` already exists in the framework
- `NotificationPopover.fragment.xml`
- `NotificationBell.fragment.xml` — bell + unread badge, in the shell

**Backend:** `NotificationService` at `/odata/v4/notifications`
- `GET /Notifications` — **auto-filtered to the current user**, always
- `action markAsRead(id)` / `action markAllAsRead()`
- `function unreadCount()`
- Internal, non-OData: `srv/lib/notify.js` (Contract C)

**Entities:** `Notifications`, `NotificationTypes` (a code list, not a table of rows users can edit)

---

### 4.5 User Profile

**What the design shows** (`Profile.html`):
- A cover photo band, then a header: large avatar, name, an **expertise level chip** computed from total score, position line, `Voir la timeline` and `Modifier le profil` buttons, then a bio paragraph.
- Four KPI cards: **Score total** (`1200 pts` = badges 400 + publications 480 + contributions 320), **Badges** (with a progress bar toward `badgeGoal` 1000), **Publications**, **Contributions**.
- Three tabs: `Publications` (post cards), `Activité` (timeline), `Certifications`.
- Certifications tab has three groups: **Obtenues**, **En cours** (with provider + start date), **Recommandées** (with a reason and a `Commencer` button).
- Right sidebar: **Expertise** (skill bars, same as Experts) and **Historique des badges**.
- A modal dialog: **Timeline de contribution**, grouped by month, each entry `+{points} {label}`.

**The level thresholds are in the design code** — implement exactly:

| Total score | Level |
|---|---|
| ≥ 1500 | Master |
| ≥ 1000 | Spécialiste |
| ≥ 600 | Expert |
| ≥ 250 | Contributeur |
| < 250 | Débutant |

⚠️ **Compute this server-side.** The design computes it in the browser; that means a user could edit their own level in devtools. It's cosmetic, but it's the exact habit that causes real vulnerabilities elsewhere.

**Pages**
| Page | Route |
|---|---|
| My profile | `#/profile` |
| Edit profile | `#/profile/edit` |
| (Public profile) | reuses `#/experts/{id}` |

**Reusable components:** `SkillList`, `BadgeList`, `ActivityTimeline`, `UserAvatar` (all shared with Experts), plus `ScoreKpiCard`, `CertificationGroup`, `ContributionTimelineDialog`.

**Backend:** same `PeopleService`
- `function getMyProfile()` — resolves the caller from the token, **auto-provisions the row if it doesn't exist yet** (Lot 1 only does this on write; a user who has never posted has no profile row and your page would 404)
- `PATCH /MyProfile` — bio and display fields only; **never** reputation, level or badges
- `function getContributionTimeline(months)`
- `POST /UserCertifications`

**Entities:** `UserProfiles`, `UserSkills`, `UserBadges`, `ReputationEvents`, `Certifications`, `UserCertifications`

---

### 4.6 Dashboard

Five different pages behind one route. Build last.

**Employee** — 4 score cards (total/badges/publications/contributions), an *Activité de connaissance* card with 5 counters (Publications 18, Questions posées 6, Réponses 24, Réponses acceptées 11, Commentaires 37), a `Voir la timeline` button, then Compétences (skill bars) and Certifications (3 groups).

**Manager** — 5 KPI cards (Employés actifs 42, Activité équipe +18%, Contributions 96, Validations en attente 3, Top contributeur), a **pending-validation queue** with inline `Rejeter`/`Approuver` buttons and a `Voir tout →` link to the Validation page, *Expertise de l'équipe* (skill + headcount), *Suivi des questions* (title + status chip), *Activité des rooms*.

**HR** — 4 KPI cards (178 total / 156 actifs / niveau moyen / +12% croissance), *Évolution des compétences* with quarter-over-quarter deltas, *Objectifs* with status chips, a certifications summary (64/23/41), *Top contributeurs*, and the *Catalogue de récompenses* (Sac 5000 / Ordinateur 10000 / Smartphone 20000). **Read-only** per spec §4.8.

**Admin** — 4 KPI cards (178/156/5 rôles/+9%), four navigation cards (Utilisateurs, Rôles, Permissions, Paramètres système), and a platform statistics strip (1240 publications, 386 questions, 214 KC items, 18 rooms actives).

**Intern** — a restriction banner, 4 KPI cards (jours restants 42, questions 5, rapports 1, fichiers 8), four navigation cards (Fil d'actualité, Room Stage, Rapports de stage, Dépôt de projet), *Mes questions récentes*, *Rapport de stage* status.

**Pages:** `#/dashboard` — one route, five renderings selected **by the server from the token role**.

**Reusable components:** `KpiCard`, `SkillProgressList`, `PendingReviewRow`, `NavigationCard`, `StatusChip`, `TimelineDialog`.

**Backend:** `DashboardService` at `/odata/v4/dashboard`
- `function getDashboard()` → returns a role-shaped payload; internally a **Strategy per role** (§5.4)

**Entities:** none of its own — pure aggregation.

---

## 5. Architecture

### 5.1 The layers, and what belongs in each

```
┌──────────────────────────────────────────────────────────────┐
│  PRESENTATION — SAPUI5 freestyle                             │
│  XML Views · Controllers · Fragments · i18n · Formatters      │
│  Rule: NO business rules here. A disabled button is a hint,   │
│  not a security control.                                     │
└───────────────────────────┬──────────────────────────────────┘
                            │ OData V4 (JSON/HTTP)
┌───────────────────────────▼──────────────────────────────────┐
│  SERVICE — CAP service definitions (.cds)                    │
│  Projections · Actions · Functions · @requires · @restrict    │
│  Rule: authorization is DECLARED here, in annotations.        │
└───────────────────────────┬──────────────────────────────────┘
┌───────────────────────────▼──────────────────────────────────┐
│  HANDLER — thin (srv/handlers/*.js)                          │
│  Registers hooks, reads req.data, calls a service, returns.   │
│  Rule: a handler method should be ~10 lines. If it's 60,      │
│  the logic belongs one layer down.                            │
└───────────────────────────┬──────────────────────────────────┘
┌───────────────────────────▼──────────────────────────────────┐
│  DOMAIN / BUSINESS — plain JS (srv/lib/, srv/domain/)         │
│  ReputationService · SearchStrategy · NotificationPublisher   │
│  · DashboardProviders                                         │
│  Rule: no `req` object here. Pure functions where possible —  │
│  that's what makes them unit-testable without HTTP.           │
└───────────────────────────┬──────────────────────────────────┘
┌───────────────────────────▼──────────────────────────────────┐
│  PERSISTENCE — CDS entities (db/*.cds) → SAP HANA Cloud       │
│  Local dev: SQLite. Production: HANA HDI container.           │
└──────────────────────────────────────────────────────────────┘
```

**Why the handler/domain split matters, concretely:** "award 50 points for an approved publication" is needed by the Knowledge Center approval flow, the Dashboard recomputation, and (later) a nightly job. If that logic lives inside a `this.on('approve', …)` handler, the other two callers can't reach it. In `srv/domain/ReputationService.js` all three call the same function. That is the Single Responsibility Principle doing real work, not a textbook exercise.

### 5.2 Per-module flow

**Knowledge Center**
```
KnowledgeList.view.xml  ──$filter/$top/$skip──▶  KnowledgeService
        │                                             │
        │                                    @restrict where: status = 'approved'
        │                                          OR contributors.user = $user
        │                                             ▼
        │                                    KnowledgeItems ──▶ HANA
        ▼
KnowledgeDetail.view.xml ──addComment()──▶ handler ──▶ CommentService (domain)
                                                    └──▶ notify()  ← your Contract C
```

**Search** — this one is different: it is *not* a CRUD projection.
```
SearchStandalone.controller.js
        │  GET /search/search(q='cap',type='Article',top=20)
        ▼
SearchService handler ──▶ SearchOrchestrator (domain)
                                 │
              ┌──────────────────┼───────────────────┐
              ▼                  ▼                   ▼
    KnowledgeSearchProvider  PostSearchProvider  PeopleSearchProvider …
              │                  │                   │
              └────── each applies its OWN authorization filter ──────┘
                                 ▼
                      merge → score → sort → paginate
                                 ▼
                    many SearchResult (normalised shape)
```
⚠️ **The critical rule:** each provider applies its own read restrictions. If you search across tables with one raw SQL union, you will leak drafts, confidential items and intern-restricted rooms into results. Search is the number-one place authorization leaks happen in this kind of app, because it's the one feature that deliberately crosses every boundary.

**Dashboard**
```
Dashboard.controller.js ──getDashboard()──▶ handler
                                              │
                                    resolve role from req.user.is()
                                              ▼
                                   DashboardStrategyFactory
                        ┌────────┬─────────┬──────┬───────┬────────┐
                        ▼        ▼         ▼      ▼       ▼
                    Employee  Manager     HR   Admin   Intern
                                │
                    ┌───────────┼────────────┐
                    ▼           ▼            ▼
            ReputationProvider  ValidationProvider(MOCK)  RoomProvider(MOCK)
```

### 5.3 Why five services and not one

| Service | Path | Why separate |
|---|---|---|
| `KnowledgeService` | `/odata/v4/knowledge` | Own authorization model (status-based row filtering) |
| `PeopleService` | `/odata/v4/people` | Experts + Profile share entities; splitting them would duplicate handlers |
| `NotificationService` | `/odata/v4/notifications` | Always filtered to `$user`; a completely different security posture |
| `SearchService` | `/odata/v4/search` | No entities of its own; read-only; function-based |
| `DashboardService` | `/odata/v4/dashboard` | No entities; read-only aggregation; role-dispatched |

Matches Lot 1's `/odata/v4/feed`. Each UI5 app binds only the service it needs, so its OData metadata document stays small — which matters, because UI5 downloads and parses that metadata on every app start.

### 5.4 Patterns you'll use (and should be able to explain in your defence)

| Pattern | Where | Why |
|---|---|---|
| **Strategy** | Dashboard (per role), Search (per content type, per DB backend) | Adding a 6th role = one new file, zero edits to existing code — the Open/Closed Principle |
| **Dependency Inversion** | Dashboard providers, `notify()` | Depend on interfaces so Lots 1 & 3 can be mocked |
| **Repository** | `srv/repositories/*.js` | Keeps CQL queries out of business logic; makes the HANA/SQLite difference invisible upstream |
| **Event ledger** | `ReputationEvents` | Auditable, recomputable, no drift |
| **Facade** | `notify()` | One entry point hides table, dedup and delivery |

---

## 6. Folder structure

### 6.1 Proposed layout (Lot 2 additions marked 🆕)

```
SAP-Basis-knowledge-center/
│
├── db/
│   ├── schema.cds                    # Lot 1 — DO NOT EDIT
│   ├── people.cds              🆕    # extend UserProfiles; skills, badges, reputation
│   ├── knowledge.cds           🆕    # KnowledgeItems + satellites, Topics
│   ├── notifications.cds       🆕    # Notifications
│   └── data/                   🆕    # CSV seed data for local dev
│       ├── aymax.knowledgehub-Topics.csv
│       ├── aymax.knowledgehub-Badges.csv
│       └── aymax.knowledgehub-KnowledgeItems.csv
│
├── srv/
│   ├── feed-service.cds / .js        # Lot 1
│   ├── handlers/FeedHandler.js       # Lot 1
│   │
│   ├── knowledge-service.cds   🆕
│   ├── knowledge-service.js    🆕
│   ├── people-service.cds      🆕
│   ├── people-service.js       🆕
│   ├── notification-service.cds 🆕
│   ├── notification-service.js 🆕
│   ├── search-service.cds      🆕
│   ├── search-service.js       🆕
│   ├── dashboard-service.cds   🆕
│   ├── dashboard-service.js    🆕
│   │
│   ├── handlers/               🆕    # THIN: hooks only
│   │   ├── KnowledgeHandler.js
│   │   ├── PeopleHandler.js
│   │   ├── NotificationHandler.js
│   │   ├── SearchHandler.js
│   │   └── DashboardHandler.js
│   │
│   ├── domain/                 🆕    # Business logic, no `req`, unit-testable
│   │   ├── ReputationService.js
│   │   ├── ExpertiseLevelCalculator.js
│   │   ├── KnowledgeWorkflow.js
│   │   ├── search/
│   │   │   ├── SearchOrchestrator.js
│   │   │   ├── providers/{Knowledge,Post,Question,People,Room,Topic,Tag}SearchProvider.js
│   │   │   └── strategies/{HanaFuzzy,LikeFallback}SearchStrategy.js
│   │   └── dashboard/
│   │       ├── DashboardStrategyFactory.js
│   │       ├── strategies/{Employee,Manager,HR,Admin,Intern}Dashboard.js
│   │       └── providers/{Validation,Room,Question}Provider.js
│   │
│   ├── repositories/           🆕    # CQL lives here, nowhere else
│   │   ├── KnowledgeRepository.js
│   │   ├── UserProfileRepository.js
│   │   └── NotificationRepository.js
│   │
│   ├── lib/                    🆕    # Cross-cutting, shared with other lots
│   │   ├── notify.js                 # ← Contract C
│   │   ├── auth.js                   # role helpers over req.user
│   │   └── errors.js
│   │
│   └── middleware/             🆕
│       └── auditLog.js               # spec §4.1 "journalisation des accès sensibles"
│
├── app/
│   ├── feed/                         # Lot 1
│   ├── knowledge/              🆕
│   ├── experts/                🆕
│   ├── notifications/          🆕
│   ├── profile/                🆕
│   ├── search/                 🆕
│   ├── dashboard/              🆕
│   └── shared/                 🆕    # ← the important one, see 6.3
│
├── test/                       🆕
│   ├── unit/domain/
│   └── integration/
│
├── mta.yaml
├── xs-security.json                  # ← must be filled in, §8 Step 2
└── TODO-INTEGRATION.md         🆕    # every mock, every open contract
```

### 6.2 Inside one UI5 app

```
app/knowledge/webapp/
├── manifest.json                # dataSources, models, ROUTING (Lot 1 has none — you need it)
├── Component.js
├── index.html
├── view/
│   ├── App.view.xml             # shell + router outlet
│   ├── KnowledgeList.view.xml
│   ├── KnowledgeDetail.view.xml
│   └── KnowledgeEdit.view.xml
├── controller/
│   ├── BaseController.js        # ← nav, i18n, model helpers; every controller extends it
│   ├── KnowledgeList.controller.js
│   ├── KnowledgeDetail.controller.js
│   └── KnowledgeEdit.controller.js
├── fragment/
│   ├── KnowledgeCard.fragment.xml
│   ├── StatusChip.fragment.xml
│   └── AttachmentRow.fragment.xml
├── model/
│   ├── models.js
│   └── formatter.js             # status→colour, date→relative, etc.
├── i18n/
│   ├── i18n.properties          # French (default)
│   └── i18n_en.properties
└── css/style.css
```

**`BaseController.js` matters more than it looks.** Every controller needs `getRouter()`, `getResourceBundle()`, `getModel()`, `onNavBack()`. Written once in a base class and extended, that's ~40 lines total across 7 apps. Copy-pasted into 20 controllers, it's 800 lines and 20 places to fix a bug. This is the most common source of duplication in UI5 projects.

### 6.3 The shared-UI problem, and how to solve it honestly

Your 7 modules share: the header shell, `UserAvatar`, `SkillList`, `BadgeList`, `ActivityTimeline`, `TagChipList`, `StatusChip`, the notification bell, and the global search field. Three realistic options:

| Option | How | Pros | Cons | Verdict |
|---|---|---|---|---|
| **A. Copy fragments per app** | Duplicate the XML | Zero setup | 7 copies of the shell to maintain — the design has an identical header on all 21 pages | ❌ |
| **B. One UI5 app, many routes** | Single `app/knowledgehub/` with routing across all Lot 2 pages | Real code reuse, one shell, one router, matches the design's SPA feel | Conflicts with Lot 1's per-module app structure; needs team buy-in | ⭐ **Best** if the team agrees |
| **C. A UI5 reuse library** | `app/shared/` as `sap.ui.core.Lib`, consumed by all apps | Textbook-correct | Extra build config; heavy for an internship timeline | 🟡 If time allows |

**My recommendation: propose B to the team.** The design is unambiguously a single-page app with one persistent header — 21 pages sharing one `<header class="nav">`. Splitting it into 7 UI5 apps means 7 shells and 7 routers to keep in sync, and full page reloads when the user clicks "Experts" in the nav.

If the team says no (Lot 1 already ships `app/feed`), fall back to C and put the shell in `app/shared/`. Do **not** silently pick A — it feels fastest in week 1 and costs you three days in week 5.

---

## 7. Database design — Lot 2 entities only

Only entities my modules need. No `Issues`, no `AI-RISK-REPORTS`, no `Approvals` — those belong to other lots. Where I need a Lot 1 entity, I `extend` rather than redefine.

### 7.1 `db/people.cds` — identity, expertise, reputation

```cds
namespace aymax.knowledgehub;
using { aymax.knowledgehub as kh } from './schema';
using { cuid, managed } from '@sap/cds/common';

// ── Extend Lot 1's UserProfiles instead of editing his file ──
extend kh.UserProfiles with {
  bio             : String(1000);
  position        : String(100);         // "Consultante SAP HANA"
  avatarColor     : String(7);           // '#597ea3' — design uses per-user colours
  initials        : String(4);           // 'NF'
  expertiseLevel  : String(20);          // cached; derived from reputation
  isExpert        : Boolean default false;
  skills          : Composition of many UserSkills        on skills.user  = $self;
  userBadges      : Composition of many UserBadges        on userBadges.user = $self;
  certifications  : Composition of many UserCertifications on certifications.user = $self;
}

entity UserSkills : cuid {
  user      : Association to kh.UserProfiles;
  skillName : String(100);               // 'SAP HANA'
  level     : Integer;                   // 1..5 → renders as ★★★★★
  percent   : Integer;                   // 0..100 → progress bar width
  updatedAt : Timestamp;
}

entity Badges : cuid {
  code        : String(50) @assert.unique;   // 'EXPERT_CONTRIBUTOR'
  name        : String(100);                 // 'Contributeur Expert'
  description : String(500);
  points      : Integer default 0;
  iconName    : String(50);
}

entity UserBadges : cuid {
  user     : Association to kh.UserProfiles;
  badge    : Association to Badges;
  earnedAt : Timestamp;
}

// ── The reputation LEDGER: append-only, never updated, never deleted ──
entity ReputationEvents : cuid {
  user       : Association to kh.UserProfiles;
  points     : Integer;                  // may be negative
  reason     : String(50);               // 'PUBLICATION_APPROVED'
  category   : String(20) enum { badge; publication; contribution };
  sourceType : String(50);               // 'KnowledgeItem' | 'Post' | 'Question'
  sourceID   : UUID;
  occurredAt : Timestamp;
}

entity Certifications : cuid {
  name        : String(200);
  provider    : String(100);             // 'SAP Learning'
  description : String(500);
  relatedSkill: String(100);             // drives "Recommandées"
}

entity UserCertifications : cuid, managed {
  user          : Association to kh.UserProfiles;
  certification : Association to Certifications;
  status        : String(20) enum { earned; in_progress; recommended };
  earnedDate    : Date;
  startDate     : Date;
  progress      : Integer default 0;     // 0..100
  reason        : String(200);           // "Basé sur vos compétences Java"
}
```

**Why a ledger rather than just `reputation: Integer`?**

`UserProfiles.reputation` (Lot 1's field) stays — it's a read cache, and the Experts grid sorts on it, so it must be a real indexed column. But it is **derived**:

```
reputation = SELECT SUM(points) FROM ReputationEvents WHERE user = X
```

This buys you four things: (1) the Profile "Timeline de contribution" dialog is a straight query on the ledger, not a second table; (2) the three Profile KPI cards (badges 400 / publications 480 / contributions 320) are `GROUP BY category`; (3) if a counter drifts after a failed transaction you recompute instead of guessing; (4) it's an audit trail, which the spec asks for anyway (§4.1).

**Cost:** an extra insert on every scoring action. Worth it.

### 7.2 `db/knowledge.cds` — the content library

```cds
namespace aymax.knowledgehub;
using { aymax.knowledgehub as kh } from './schema';
using { cuid, managed } from '@sap/cds/common';

entity Topics : cuid {
  name          : String(100) @assert.unique;   // 'SAP BTP'
  description   : String(500);
  department    : String(100);
  articleCount  : Integer default 0;            // denormalised
  questionCount : Integer default 0;
}

entity KnowledgeItems : cuid, managed {
  title           : String(300) @mandatory;
  category        : String(30) enum {
    article; documentation; report; tutorial;
    best_practice; resolved_question; faq; template
  };
  excerpt         : String(500);
  content         : LargeString;
  topic           : Association to Topics;

  status          : String(20) enum { draft; pending; approved; rejected } default 'draft';
  confidentiality : String(20) enum { public; internal; confidential } default 'internal';  // spec §4.2, C5

  publishedAt     : Timestamp;
  viewCount       : Integer64 default 0;
  fromQuestion    : Boolean default false;
  sourceQuestionID: UUID;                       // set when promoted (Lot 3)

  tags            : Composition of many KnowledgeItemTags on tags.item = $self;
  contributors    : Composition of many KnowledgeContributors on contributors.item = $self;
  attachments     : Composition of many KnowledgeAttachments on attachments.item = $self;
  relatedItems    : Composition of many KnowledgeRelations on relatedItems.item = $self;
}

entity KnowledgeItemTags : cuid {
  item : Association to KnowledgeItems;
  tag  : Association to kh.Tags;                // reuse Lot 1's Tags — do not duplicate
}

entity KnowledgeContributors : cuid {
  item : Association to KnowledgeItems;
  user : Association to kh.UserProfiles;
  role : String(20) enum { author; contributor; reviewer } default 'author';
}

entity KnowledgeAttachments : cuid, managed {
  item     : Association to KnowledgeItems;
  fileName : String(255);
  fileUrl  : String(1000);       // signed URL — the binary is NOT in HANA
  fileType : String(50);
  fileSize : Integer;
}

entity KnowledgeRelations : cuid {
  item        : Association to KnowledgeItems;
  relatedItem : Association to KnowledgeItems;
  relationType: String(20) enum { related; supersedes; prerequisite } default 'related';
}

// ── Comments: extend Lot 1's entity, do not create a second one (Contract B) ──
extend kh.Comments with {
  knowledgeItem : Association to KnowledgeItems;
}
```

**Note on attachments:** never store file binaries in HANA columns. Store metadata + a URL to SAP Document Management Service or an ObjectStore. Lot 1 already made this choice for `PostDocuments` — stay consistent.

### 7.3 `db/notifications.cds`

```cds
namespace aymax.knowledgehub;
using { aymax.knowledgehub as kh } from './schema';
using { cuid } from '@sap/cds/common';

entity Notifications : cuid {
  recipient    : Association to kh.UserProfiles;
  actor        : Association to kh.UserProfiles;    // who caused it (nullable: system events)
  type         : String(40);                        // see §8.4 for the closed list
  category     : String(30);                        // display label from the design
  title        : String(200);
  message      : String(500);
  sourceType   : String(50);                        // 'Post' | 'KnowledgeItem' | 'Question'
  sourceID     : UUID;
  targetUrl    : String(300);                       // deep link for the click action
  priority     : String(10) enum { low; medium; high } default 'medium';
  isRead       : Boolean default false;
  readAt       : Timestamp;
  createdAt    : Timestamp;
}
```

**Recommended HANA indexes** (add once you deploy; these are the queries you will actually run):

| Table | Index | Serves |
|---|---|---|
| `Notifications` | `(recipient_userID, isRead, createdAt DESC)` | The list query and the unread count — the two hottest reads in the app |
| `KnowledgeItems` | `(status, category, publishedAt DESC)` | The KC list + category tabs |
| `KnowledgeItems` | `(topic_ID)` | Topic drill-down |
| `ReputationEvents` | `(user_userID, occurredAt DESC)` | Timeline dialog |
| `UserProfiles` | `(department, reputation DESC)` | Experts grid, sorted, filtered |

### 7.4 Entity-relationship overview

```
UserProfiles ──1:N──▶ UserSkills
     │        ──1:N──▶ UserBadges ──N:1──▶ Badges
     │        ──1:N──▶ ReputationEvents         (append-only ledger)
     │        ──1:N──▶ UserCertifications ──N:1──▶ Certifications
     │        ──1:N──▶ Notifications  (as recipient)
     │        ──1:N──▶ Notifications  (as actor)
     │        ──1:N──▶ KnowledgeContributors
     │
Topics ──1:N──▶ KnowledgeItems
                     │──1:N──▶ KnowledgeItemTags ──N:1──▶ Tags   (Lot 1's)
                     │──1:N──▶ KnowledgeContributors
                     │──1:N──▶ KnowledgeAttachments
                     │──1:N──▶ KnowledgeRelations ──▶ KnowledgeItems (self)
                     │──1:N──▶ Comments            (Lot 1's, extended)
```

### 7.5 Entities I deliberately did NOT create

| Not created | Why |
|---|---|
| `Users`, `Roles` | Identity lives in SAP IAS/XSUAA. `UserProfiles` only *enriches* it. Never store passwords. |
| `Issues` | Troubleshooting is another lot (and unresolved: C3) |
| `AI-RISK-REPORTS` | AI Security Guardian — another lot |
| `Approvals` | Validation workflow — another lot. You *read* pending counts via a provider interface. |
| `Rooms`, `Posts`, `Likes` | Lot 1 owns them; you read them |
| `Questions` | Lot 3 |
| `AuditLogs` | Cross-cutting; propose it to the team, don't claim it |

---

## 8. API design

CAP gives you OData V4 automatically from the CDS projections. You only hand-write the endpoints that aren't CRUD. Below, `Auth` describes what the server enforces — not what the UI hides.

### 8.1 Roles and scopes (to be added to `xs-security.json`)

`xs-security.json` is currently empty, so **no authorization exists at all today**. Proposed content — this is a team-level artefact, so raise it as a PR:

```json
{
  "xsappname": "aymax-knowledge-hub",
  "tenant-mode": "dedicated",
  "scopes": [
    { "name": "$XSAPPNAME.Knowledge.Read",     "description": "Read knowledge content" },
    { "name": "$XSAPPNAME.Knowledge.Write",    "description": "Create and edit knowledge content" },
    { "name": "$XSAPPNAME.Knowledge.Approve",  "description": "Approve or reject content" },
    { "name": "$XSAPPNAME.People.Read",        "description": "Browse the expert directory" },
    { "name": "$XSAPPNAME.People.Admin",       "description": "Administer user profiles" },
    { "name": "$XSAPPNAME.Dashboard.Employee", "description": "Employee dashboard" },
    { "name": "$XSAPPNAME.Dashboard.Manager",  "description": "Manager dashboard" },
    { "name": "$XSAPPNAME.Dashboard.HR",       "description": "HR dashboard" },
    { "name": "$XSAPPNAME.Dashboard.Admin",    "description": "Admin dashboard" },
    { "name": "$XSAPPNAME.Dashboard.Intern",   "description": "Intern dashboard" }
  ],
  "role-templates": [
    { "name": "Employee",          "scope-references": ["$XSAPPNAME.Knowledge.Read","$XSAPPNAME.Knowledge.Write","$XSAPPNAME.People.Read","$XSAPPNAME.Dashboard.Employee"] },
    { "name": "Intern",            "scope-references": ["$XSAPPNAME.Knowledge.Read","$XSAPPNAME.People.Read","$XSAPPNAME.Dashboard.Intern"] },
    { "name": "DepartmentManager", "scope-references": ["$XSAPPNAME.Knowledge.Read","$XSAPPNAME.Knowledge.Write","$XSAPPNAME.Knowledge.Approve","$XSAPPNAME.People.Read","$XSAPPNAME.Dashboard.Manager"] },
    { "name": "HR",                "scope-references": ["$XSAPPNAME.People.Read","$XSAPPNAME.Dashboard.HR"] },
    { "name": "Admin",             "scope-references": ["$XSAPPNAME.Knowledge.Read","$XSAPPNAME.Knowledge.Write","$XSAPPNAME.Knowledge.Approve","$XSAPPNAME.People.Read","$XSAPPNAME.People.Admin","$XSAPPNAME.Dashboard.Admin"] }
  ]
}
```

**Note the Intern role has no `Knowledge.Write`** — that is the design's disabled `Contribuer` button, enforced where it actually counts.

In CDS, roles map to `@requires` / `@restrict` by **role-template name**:

```cds
@requires: 'authenticated-user'
service KnowledgeService {
  @restrict: [
    { grant: 'READ',   to: 'any',
      where: 'status = ''approved'' or contributors.user.userID = $user' },
    { grant: ['CREATE','UPDATE'], to: ['Employee','DepartmentManager','Admin'] },
    { grant: 'DELETE', to: ['Admin'] }
  ]
  entity KnowledgeItems as projection on kh.KnowledgeItems;
}
```

That `where:` clause is **row-level security**, evaluated inside the SQL query. It is what makes "drafts are only visible to their author" true even if someone calls the OData URL directly with Postman. This is the most important single line in your lot.

### 8.2 Search API

| # | Method | URL | Purpose |
|---|---|---|---|
| 1 | GET | `/odata/v4/search/search(q='cap',type='Article',top=20,skip=0)` | Unified cross-entity search |
| 2 | GET | `/odata/v4/search/suggest(q='ca')` | Type-ahead suggestions (phase 2) |
| 3 | GET | `/odata/v4/search/popularQueries()` | The 6 empty-state chips |

**1 — `search`**

```cds
type SearchResult {
  resultType : String(30);   // Question|Article|Documentation|Expert|Room|Sujet|Tag|Publication|Certification
  id         : String(36);
  title      : String(300);
  excerpt    : String(500);
  meta       : String(200);  // "SAP BTP · Résolue"
  url        : String(300);  // deep link
  score      : Decimal(5,4);
}
type SearchFacet  { resultType : String(30); count : Integer; }
type SearchResponse { total : Integer; facets : many SearchFacet; results : many SearchResult; }

function search(q : String, type : String, top : Integer, skip : Integer) returns SearchResponse;
```

Response:
```json
{
  "total": 9,
  "facets": [{ "resultType": "Question", "count": 1 }, { "resultType": "Article", "count": 1 }],
  "results": [{
    "resultType": "Question",
    "id": "3f2a…",
    "title": "Erreur de déploiement CAP sur Cloud Foundry : \"xsuaa binding not found\"",
    "excerpt": "Le binding XSUAA n'est pas reconnu au démarrage…",
    "meta": "SAP BTP · Résolue",
    "url": "#/questions/3f2a…",
    "score": 0.9210
  }]
}
```

**Auth:** `authenticated-user`. Each provider applies its own restriction — the caller's role changes what comes back, never the request.

⚠️ Facet counts must be computed **after** authorization filtering. If you count first and filter second, the tab says "Articles 12" and the list shows 4 — and you've just told the user that 8 documents exist that they aren't allowed to see. That's an information leak, small but real.

**Guardrails:** `top` clamped to ≤ 50 server-side; `q` shorter than 2 characters returns empty rather than scanning every table; escape `%` and `_` in the query string.

### 8.3 Experts & Profile API (`/odata/v4/people`)

| # | Method | URL | Purpose | Auth |
|---|---|---|---|---|
| 4 | GET | `/Experts?$filter=department eq 'Solutions SAP'&$orderby=reputation desc&$top=20` | Expert directory | `People.Read` |
| 5 | GET | `/Experts('{id}')?$expand=skills,userBadges($expand=badge)` | Expert detail | `People.Read` |
| 6 | GET | `/Experts('{id}')/activity(limit=10)` | Recent activity timeline | `People.Read` |
| 7 | GET | `/getMyProfile()` | Current user's profile (auto-provisions) | authenticated |
| 8 | PATCH | `/MyProfile` | Update bio / position only | self only |
| 9 | GET | `/getContributionTimeline(months=6)` | Grouped `+points` ledger for the dialog | self only |
| 10 | GET | `/MyProfile/skills` | Skill bars | self only |
| 11 | GET | `/MyCertifications?$filter=status eq 'earned'` | Certification groups | self only |
| 12 | POST | `/UserCertifications` | Add a certification | self only |
| 13 | GET | `/getRecommendedCertifications()` | Suggestions based on skills | self only |
| 14 | GET | `/getDepartments()` | Filter buttons | `People.Read` |

**7 — `getMyProfile()`** response:
```json
{
  "userID": "sami.benyoussef@aymax.tn",
  "displayName": "Sami Ben Youssef",
  "position": "Consultant SAP BTP",
  "department": "Solutions SAP",
  "initials": "SB", "avatarColor": "#749dc4",
  "bio": "Consultant SAP BTP chez Aymax Tunisie…",
  "reputation": 1200,
  "expertiseLevel": "Spécialiste",
  "scoreBreakdown": { "badges": 400, "publications": 480, "contributions": 320 },
  "badgeGoal": 1000
}
```

⚠️ **PATCH `/MyProfile` must whitelist fields.** `bio`, `position`, `avatarColor` — yes. `reputation`, `expertiseLevel`, `isExpert`, `userID` — never. If you project the whole entity as updatable, a user can PATCH their own reputation to 999999. Enforce it in the projection:

```cds
entity MyProfile as projection on kh.UserProfiles { bio, position, avatarColor, displayName };
```

Whitelisting in the projection is better than validating in the handler: what isn't exposed can't be attacked.

### 8.4 Notifications API (`/odata/v4/notifications`)

| # | Method | URL | Purpose | Auth |
|---|---|---|---|---|
| 15 | GET | `/Notifications?$orderby=createdAt desc&$top=20` | List, **implicitly filtered to caller** | authenticated |
| 16 | GET | `/Notifications?$filter=isRead eq false` | Unread only | authenticated |
| 17 | GET | `/unreadCount()` | Badge number for the bell | authenticated |
| 18 | POST | `/markAsRead` `{ "id": "…" }` | Mark one | owner only |
| 19 | POST | `/markAllAsRead` | Mark all | caller only |
| 20 | DELETE | `/Notifications('{id}')` | Dismiss | owner only |

**Restriction — this is the whole security model for this module:**

```cds
@restrict: [
  { grant: 'READ',            where: 'recipient.userID = $user' },
  { grant: ['UPDATE','DELETE'], where: 'recipient.userID = $user' }
]
entity Notifications as projection on kh.Notifications;
```

Without that `where`, `GET /Notifications` returns **everyone's** notifications — including managers' validation alerts and security events. This is a one-line difference between a working feature and a data breach.

**The closed list of `type` values** (give this to Lots 1 and 3 as part of Contract C):

| `type` | Design category | Raised by |
|---|---|---|
| `COMMENT_ADDED` | Commentaire | Lot 1 / you |
| `ANSWER_ACCEPTED` | Réponse acceptée | Lot 3 |
| `USER_MENTIONED` | Mention | Lot 1 / Lot 3 |
| `DOC_PUBLISHED` | Documentation | You |
| `BADGE_EARNED` | Badge | You |
| `ROOM_ACTIVITY` | Room | Lot 3 |
| `CERT_COMPLETED` | Certification | You |
| `AI_RECOMMENDATION` | Recommandation | Lot 3 (AI) |
| `VALIDATION_REQUESTED` | Validation | You → managers |
| `VALIDATION_RESULT` | Validation | Lot 3 → author |
| `SECURITY_ALERT` | Sécurité | AI Security Guardian (spec §4.7) |

Anything not on this list gets rejected by `notify()`. A closed enum is what stops the table filling with `"comment_added"`, `"CommentAdded"` and `"new-comment"` from three different developers.

### 8.5 Knowledge Center API (`/odata/v4/knowledge`)

| # | Method | URL | Purpose | Auth |
|---|---|---|---|---|
| 21 | GET | `/KnowledgeItems?$filter=category eq 'article'&$expand=topic,tags&$top=20` | List | `Knowledge.Read` + row filter |
| 22 | GET | `/getCategoryCounts()` | Tab counts | `Knowledge.Read` |
| 23 | GET | `/KnowledgeItems('{id}')?$expand=contributors,attachments,comments,relatedItems` | Detail | `Knowledge.Read` + row filter |
| 24 | POST | `/KnowledgeItems` | Create draft | `Knowledge.Write` (**not Intern**) |
| 25 | PATCH | `/KnowledgeItems('{id}')` | Edit | author, only while `draft`/`rejected` |
| 26 | POST | `/submitForReview` `{ "id": "…" }` | draft → pending | author |
| 27 | POST | `/approveItem` / `/rejectItem` | pending → approved/rejected | `Knowledge.Approve` |
| 28 | POST | `/addComment` `{ "itemID":"…", "content":"…" }` | Comment | `Knowledge.Read` |
| 29 | GET | `/KnowledgeItems('{id}')/getRelated()` | Sidebar "Documents liés" | `Knowledge.Read` |
| 30 | POST | `/promoteQuestion` `{ "questionID": "…" }` | Solved question → KC item | `Knowledge.Approve` (Lot 3 integration) |
| 31 | POST | `/KnowledgeItems('{id}')/attachments` | Upload metadata | author |
| 32 | POST | `/incrementView` `{ "id": "…" }` | View counter | authenticated |
| 33 | GET | `/Topics` | Topic list | `Knowledge.Read` |

**Row-level restriction (implements the design's `ownedByMe` rule):**
```
where: status = 'approved'
    or contributors.user.userID = $user
    or $user.role = 'DepartmentManager'      -- managers see the validation queue
```

**State machine — enforce it in `KnowledgeWorkflow.js`, not in the controller:**
```
draft ──submitForReview──▶ pending ──approve──▶ approved
  ▲                            │
  └──────── reject ◀───────────┘  (→ rejected, editable again)
```
Any transition not on this diagram must throw. If the transition check lives only in the UI, a `PATCH` with `{"status":"approved"}` from Postman publishes unreviewed content — bypassing AI Security Guardian entirely, which is the spec's central security feature.

**26 — `submitForReview` side effects** (all in the domain layer, in one transaction):
1. Validate current status is `draft` or `rejected`
2. Validate the caller is a contributor
3. *(Later)* invoke AI Security Guardian; block if risk ≥ 70 (spec §7.7)
4. Set `status = 'pending'`
5. `notify()` the department managers with `VALIDATION_REQUESTED`

### 8.6 Dashboard API (`/odata/v4/dashboard`)

| # | Method | URL | Purpose | Auth |
|---|---|---|---|---|
| 34 | GET | `/getDashboard()` | Role-shaped payload | authenticated; shape from token |
| 35 | GET | `/getEmployeeStats()` | The 5 activity counters | `Dashboard.Employee` |
| 36 | GET | `/getTeamOverview()` | Manager KPIs | `Dashboard.Manager` |
| 37 | GET | `/getPendingReviews(top=5)` | Validation queue preview | `Dashboard.Manager` |
| 38 | GET | `/getHRAnalytics()` | HR KPIs + skill deltas | `Dashboard.HR` |
| 39 | GET | `/getPlatformStats()` | Admin counters | `Dashboard.Admin` |
| 40 | GET | `/getInternOverview()` | Intern KPIs | `Dashboard.Intern` |

**One `getDashboard()` or five separate endpoints?** Use **both**: `getDashboard()` is the single call the page makes (one round trip, and the client can't request a role it doesn't hold); the granular ones exist for refreshing a single card without reloading the page.

⚠️ **`getDashboard()` must NOT take a role parameter.** If the signature is `getDashboard(role)`, an intern calls it with `role='admin'` and reads platform statistics. Derive the role from `req.user.is('Admin')` server-side, always. This is C7 turning into a real vulnerability.

**Caching:** Admin/HR aggregates scan large tables. Cache for 5 minutes in memory (or `@sap/cds` cache) — the numbers are dashboards, not bank balances.

### 8.7 The role-resolution rule, stated once, plainly

```js
// srv/lib/auth.js
export function resolveRole(req) {
  if (req.user.is('Admin'))             return 'admin';
  if (req.user.is('HR'))                return 'hr';
  if (req.user.is('DepartmentManager')) return 'manager';
  if (req.user.is('Intern'))            return 'intern';
  return 'employee';
}
```

The role comes from the **JWT issued by XSUAA**, which is signed by SAP and cannot be forged from the browser. It never comes from `localStorage`, from a query parameter, from a request body, or from a UI dropdown.

**How you keep the design's convenient role switcher for local development** — CAP has this built in. In `package.json`:

```json
"cds": {
  "requires": {
    "[development]": {
      "auth": {
        "kind": "mocked",
        "users": {
          "sami":   { "roles": ["Employee"] },
          "nadia":  { "roles": ["DepartmentManager"] },
          "rh":     { "roles": ["HR"] },
          "admin":  { "roles": ["Admin"] },
          "stagiaire": { "roles": ["Intern"] }
        }
      }
    },
    "[production]": { "auth": "xsuaa" }
  }
}
```

Now `cds watch` gives you basic-auth login as any of those five users (any password), you can test all five dashboards in seconds, and **the production path is completely unaffected**. You get the prototype's convenience without the prototype's vulnerability.

---

## 9. SAP Fiori design, page by page

The Claude Design mock is a custom web design system (Inter font, "blueprint" cards with corner marks, a navy palette). SAP Fiori has its own design language and its own controls. **Do not rebuild the mock's CSS by hand.** Map each mock element to the nearest standard Fiori control — that gets you accessibility, keyboard navigation, responsiveness, theming and dark mode for free, and it's what a SAP reviewer will look for.

### 9.1 The application shell (every page)

The mock's sticky header — brand, nav links, role dropdown, search input, theme toggle, avatar — is almost exactly `sap.f.ShellBar`:

| Mock element | Fiori control |
|---|---|
| `A` logo + "AYMAX / knowledge hub" | `ShellBar` `title` + `secondTitle` + `homeIcon` |
| Nav links (Tableau de bord, Fil d'actualité, …) | `ShellBar` `menu` (`sap.m.Menu`) — collapses on phone automatically |
| Search input | `ShellBar` `searchManager` (`sap.f.SearchManager`) |
| Bell + unread count | `ShellBar` `showNotifications` + `notificationsNumber` |
| Avatar | `ShellBar` `profile` (`sap.f.Avatar`) |
| Theme toggle | `ShellBar` `additionalContent` → `sap.m.Button` |
| Role dropdown | **Remove.** Dev-only, via mocked users. |

Theme: `sap_horizon` (the current Fiori 3 / Horizon theme). Dark mode: `sap_horizon_dark` — the mock has a light/dark toggle and Horizon supports it natively, so this is nearly free.

### 9.2 Search Standalone

- **Layout:** `sap.m.Page` inside `sap.f.DynamicPage`, single column, `showHeader=false` (the ShellBar is the header).
- **Facet tabs:** `sap.m.IconTabBar` with `IconTabFilter` `count` — renders the count badges the mock shows, and handles overflow on narrow screens.
- **Results:** `sap.m.List` + `sap.m.CustomListItem`, or `sap.f.GridList` if you want the card look. Use `growing="true"` `growingThreshold="20"` for infinite scroll rather than pagination buttons.
- **Type badge:** `sap.m.ObjectStatus` or `sap.m.GenericTag`.
- **Empty state:** `sap.m.IllustratedMessage` with `illustrationType="sapIllus-NoSearchResults"` — this is the Fiori-standard empty state; the mock's suggestion chips go in its `additionalContent` as `sap.m.Token`s or small buttons.
- **Responsive:** single column throughout; `IconTabBar` overflows to a select on phone.
- **Fiori guideline:** put results ≤ 400ms behind a live search with a 300ms debounce; show `busyIndicatorDelay="0"` on re-query so the user sees the list is updating.

### 9.3 Experts

- **Navigation:** `sap.f.FlexibleColumnLayout` — `TwoColumnsMidExpanded` on desktop (grid left, detail right), auto-collapsing to `OneColumn` on phone with a back button. This is *the* Fiori pattern for list→detail and it maps directly onto the mock's "grid → detail with ← Retour" flow. Routing config goes in `manifest.json`.
- **Grid:** `sap.f.GridContainer` with `sap.f.GridContainerSettings` per breakpoint (`columns` S=1, M=2, L=3, XL=4), each cell a `sap.f.Card` with a `sap.f.cards.Header`.
- **Avatar:** `sap.m.Avatar` `initials="NF"` `backgroundColor="Accent6"` `displayShape="Circle"`. Fiori has 10 built-in accent colours — hash the userID to pick one deterministically instead of storing hex codes.
- **Badges:** `sap.m.ObjectStatus` with `state="Information"`, or `sap.m.GenericTag`.
- **Detail:** `sap.uxap.ObjectPageLayout` — header with avatar/name/position + `ObjectPageHeaderActionButton`, then `ObjectPageSection`s: *Expertise*, *Badges*, *Activité récente*. The anchor bar gives you the mock's sidebar navigation, plus sticky headers.
- **Skill bars:** `sap.m.ProgressIndicator` `percentValue` `displayValue="★★★★★"` `state="Information"`.
- **Activity:** `sap.m.List` with `sap.m.FeedListItem` — designed exactly for this (avatar, text, relative timestamp). Avoid `sap.suite.ui.commons.Timeline` unless you've confirmed the library is available in your BTP subscription.

### 9.4 Knowledge Center

- **Navigation:** `FlexibleColumnLayout`, same as Experts.
- **List:** `sap.f.DynamicPage` — title area holds the "Contribuer" button and category `IconTabBar`; content holds `sap.f.GridContainer` + `sap.f.Card`.
- **Status chip:** `sap.m.ObjectStatus` with semantic states — `None` for Brouillon, `Warning` for En attente, `Success` for Approuvé, `Error` for Rejeté. **Use semantic states, never hardcoded hex.** Semantic colours adapt to theme and to high-contrast accessibility modes; hex does not.
- **Contributor avatars:** `sap.f.AvatarGroup` `groupType="Group"` — produces the mock's overlapping avatars with a "+N" overflow, out of the box.
- **Filter bar:** if you add author/date/confidentiality filters (spec §4.2), use `sap.ui.comp.filterbar.FilterBar` or `sap.ui.mdc.FilterBar` rather than hand-rolled controls.
- **Detail:** `ObjectPageLayout` — header (title, category/topic/tag chips, `Par … · publié …`), sections: *Contenu*, *Pièces jointes*, *Commentaires*, and `sap.uxap.ObjectPageLazyLoader` for the comment section so it doesn't block first paint.
- **Attachments:** `sap.m.upload.UploadSet` — the standard Fiori attachment control (file type icons, size display, download, drag-and-drop upload).
- **Comments:** `sap.m.FeedInput` + `sap.m.FeedListItem`. **Coordinate with Lot 1** — he needs the same pair on Posts. One shared fragment.
- **Create/edit:** `sap.m.Dialog` for short forms; a full `ObjectPageLayout` in edit mode for the article body. Rich text = `sap.ui.richtexteditor.RichTextEditor` (spec §4.3 "édition riche") — **check this library is available in your BTP subscription before you design around it**; if not, Markdown in a `TextArea` with a preview is a defensible fallback.
- **Empty state:** `IllustratedMessage` `illustrationType="sapIllus-NoEntries"`.

### 9.5 Notifications

Fiori has purpose-built controls here; use them rather than custom list items:

- `sap.m.NotificationListItem` — `title`, `description`, `datetime`, `priority`, `authorName`, `authorAvatar`, `unread`, a close button and an overflow menu. It renders the mock's row almost exactly, including the unread emphasis.
- `sap.m.NotificationListGroup` — group by day (`Aujourd'hui`, `Hier`, `Cette semaine`). The mock is a flat list, but grouping is the Fiori standard and genuinely better once there are 50 notifications.
- Header popover: `sap.m.ResponsivePopover` anchored to the ShellBar bell, containing the last 5 + a "Voir tout" footer. On phone it becomes a full-screen dialog automatically.
- `priority` maps to the mock's categories: `High` for security and validation, `Medium` for mentions and comments, `Low` for badges and recommendations.
- **Refresh:** poll `unreadCount()` every 60s for MVP. Mention WebSocket/SSE as a future enhancement in your report — don't build it now, it's a rabbit hole.

### 9.6 User Profile

- **Layout:** `sap.uxap.ObjectPageLayout` with `showTitleInHeaderContent`.
- **Cover photo:** `ObjectPageHeader` `backgroundImageURL` (this is what the mock's cover band is).
- **Header content:** `sap.m.Avatar` XL + name + `ObjectStatus` for the expertise level + `ObjectPageHeaderActionButton` for "Modifier le profil".
- **KPI cards:** `sap.f.Card` with `sap.f.cards.NumericHeader` — `number="1200"` `unit="pts"` `subtitle` `state`. Built for exactly this. Progress toward `badgeGoal` = `sap.m.ProgressIndicator`.
- **Tabs:** `ObjectPageSection`s driven by the anchor bar (more Fiori-idiomatic than an `IconTabBar` inside an ObjectPage).
- **Certifications:** three `sap.m.List`s (Obtenues / En cours / Recommandées) with `sap.m.ObjectListItem`, or `sap.m.Panel` with `expandable="true"` per group.
- **Timeline dialog:** `sap.m.Dialog` `stretchOnPhone="true"` containing a grouped `sap.m.List` (group headers = months, items = `+points  label`).
- **Edit mode:** `sap.ui.layout.form.SimpleForm` inside the ObjectPage — the standard Fiori display/edit toggle.

### 9.7 Dashboard

- **Layout:** `sap.f.DynamicPage` + `sap.f.GridContainer`, responsive `GridContainerSettings`:

  | Breakpoint | Width | Columns |
  |---|---|---|
  | S (phone) | < 600px | 1 |
  | M (tablet) | 600–1024px | 2 |
  | L (desktop) | 1024–1440px | 3 |
  | XL | > 1440px | 4 |

- **KPI cards:** `sap.f.Card` + `NumericHeader`, with `trend="Up"` `state="Good"` for the mock's "+18%" and "+12%" deltas — the arrow and colour come free.
- **Skill lists:** `sap.m.List` + `ProgressIndicator`.
- **Pending-review queue:** `sap.m.Table` with `sap.m.ColumnListItem`; the inline Approuver/Rejeter buttons go in the last column as `type="Transparent"`. Add a `sap.m.MessageBox.confirm` on Rejeter — destructive actions need confirmation (Fiori guideline).
- **Navigation cards** (Admin/Intern): `sap.f.Card` with `sap.f.cards.Header` and a press handler.
- **Charts** (if you add trends beyond the mock): `sap.viz.ui5.controls.VizFrame` or `sap.suite.ui.commons.ChartContainer`. Verify library availability first.
- **Loading:** each card sets its own `busy` state, so cards render as their data arrives rather than the page blocking on the slowest query. Users perceive this as roughly twice as fast even when total time is identical.
- **Empty states per card:** `IllustratedMessage`, sized `Dot` or `Spot` inside a card.

### 9.8 Cross-cutting Fiori rules

| Topic | Rule |
|---|---|
| **i18n** | Every visible string in `i18n.properties`. French is default (`i18n.properties`), English in `i18n_en.properties`. Never hardcode in XML — Lot 1 currently does; don't copy it. |
| **Formatters** | Relative dates ("Il y a 2 h") via `sap.ui.core.format.DateFormat.getDateTimeInstance({relative:true})` — locale-aware, so it becomes "2 hours ago" in English automatically. Don't hand-write this. |
| **Semantic colours** | `Success`/`Warning`/`Error`/`Information`/`None`. Never hex. Theme-safe and accessible. |
| **Spacing** | Standard classes: `sapUiSmallMargin`, `sapUiMediumMarginTop`, `sapUiResponsiveContentPadding`. Not inline `style=`. |
| **Accessibility** | `ariaLabelledBy` on every interactive control; `tooltip` on every icon-only button. The mock has icon-only buttons with no labels — fix that. |
| **Error handling** | `sap.m.MessageBox.error` for failures, `sap.m.MessageToast` for successes. Never `alert()`. Never swallow an error silently. |
| **Busy states** | `busyIndicatorDelay="1000"` on lists (avoids flicker on fast responses), `"0"` on explicit user actions. |
| **Responsive test** | Test at 360px (phone), 768px (tablet), 1440px (desktop). The mock's fixed `320px` sidebars will break at 360px — replace with FCL or a responsive `GridContainer`. |

---

## 10. Development order

### 10.1 The plan

```
STEP 0 — Setup & safety                                       (½ day)
  ├── Fork/clone, create feature/lot2-setup branch
  ├── npm install, cds watch, confirm Lot 1's feed runs locally on SQLite
  └── Confirm cf target points at YOUR dev space
            ▼
STEP 1 — Resolve open questions & agree contracts             (1 day, blocking)
  ├── Answers to C1–C7 (§2) from your supervisor
  ├── Team agreement: split db/schema.cds into per-lot files + `extend`
  ├── Team agreement: Contracts A, B, C, D (§3.3)
  └── Deliverable: a PR with the file split + an empty notify.js interface
            ▼
STEP 2 — RBAC foundation                                      (1 day)  ⚠️ DO NOT SKIP
  ├── Fill xs-security.json with scopes + role templates
  ├── Add mocked users to package.json for local dev
  └── Verify: log in as 'stagiaire' locally, confirm the token carries only Intern scopes
            ▼
STEP 3 — Database entities for Lot 2                          (2 days)
  ├── db/people.cds, db/knowledge.cds, db/notifications.cds
  ├── CSV seed data in db/data/ (use the design's mock data — it's realistic and in French)
  └── Verify: cds watch starts, tables are created, CSVs load
            ▼
STEP 4 — Module 1: NOTIFICATIONS  (full vertical slice)       (3 days)
  ├── notification-service.cds with the @restrict where clause
  ├── NotificationHandler.js + NotificationRepository.js
  ├── srv/lib/notify.js  ← publish to Lots 1 & 3 as soon as it works
  ├── app/notifications/ UI5 app
  └── Verify: user A cannot read user B's notifications (test with Postman, not the UI)
            ▼
STEP 5 — Module 2: PROFILE + EXPERTS  (shared entities)       (5 days)
  ├── people-service.cds — note the MyProfile whitelist projection
  ├── domain/ReputationService.js + ExpertiseLevelCalculator.js
  ├── app/experts/ (FCL), app/profile/ (ObjectPage)
  └── Verify: PATCH /MyProfile with {"reputation":99999} is REJECTED
            ▼
STEP 6 — Module 3: KNOWLEDGE CENTER  (largest)                (7 days)
  ├── knowledge-service.cds with status-based row restrictions
  ├── domain/KnowledgeWorkflow.js (the state machine)
  ├── notify() on submitForReview and on approve/reject
  ├── app/knowledge/ (FCL + ObjectPage + UploadSet)
  └── Verify: an Intern gets 403 on POST /KnowledgeItems; a draft is invisible to others
            ▼
STEP 7 — Module 4: SEARCH + STANDALONE                        (4 days)
  ├── SearchOrchestrator + one provider per content type
  ├── HanaFuzzy / LikeFallback strategies
  ├── app/search/
  └── Verify: search as Intern returns strictly fewer results than as Admin
            ▼
STEP 8 — Module 5: DASHBOARD  (aggregation, mocks allowed)    (5 days)
  ├── 5 strategies + provider interfaces with mock implementations
  ├── app/dashboard/
  └── Verify: getDashboard() as Intern returns the intern shape and NOTHING else
            ▼
STEP 9 — Integration                                          (3 days)
  ├── Replace mocks with Lot 1 / Lot 3 real providers
  ├── Work through TODO-INTEGRATION.md until empty
  └── Cross-lot testing with all three modules running
            ▼
STEP 10 — Testing, deploy, document                           (3 days)
  ├── Unit tests on domain/ (no HTTP needed — that's why it's a separate layer)
  ├── Integration tests per service
  ├── Deploy to YOUR dev space (§0 checklist first)
  └── Write up the architecture for your internship report
```

**Roughly 34 working days.** Adjust to your actual internship length; if it's shorter, cut Search's phase-2 semantic work and the Dashboard's HR variant first — they're the least load-bearing.

### 10.2 Why this order, specifically

**Why RBAC at Step 2 and not Step 9.** Authorization in CAP is *declarative* — `@restrict` annotations on entities. If you build seven modules with no annotations and then add them, every projection changes, every handler that assumed "I can read everything" breaks, and every test you wrote is invalid. Adding `@restrict` from the first entity costs you nothing extra per module and means every module is born secure. Retrofitting security is the single most expensive mistake in enterprise projects, and it's the one interns are most likely to make because auth feels like "not the real feature".

**Why database before backend.** CAP generates the OData service, the metadata document, and (with `cds-typer`) TypeScript types from the CDS model. The model is the contract everything else is derived from. Writing handlers against entities that don't exist yet means you write them twice.

**Why backend before frontend.** With `cds watch` running you can exercise every endpoint in Postman or the browser before a single line of XML exists. Debugging a broken feature when both layers are new is genuinely hard — you can't tell which side is wrong. Debugging a UI against a backend you've already proven works is easy.

**Why Notifications first.** It is the smallest complete vertical slice: one entity, one restriction, one list. You will learn the entire CAP + UI5 workflow — entity, service, handler, restriction, UI5 app, routing, i18n, OData binding — on a module where a mistake costs an hour, not a week. Then you repeat that workflow six more times with confidence. Starting with Knowledge Center instead means learning CAP, UI5, FCL, ObjectPage, file upload, a state machine and cross-lot integration simultaneously. That's how interns get stuck for two weeks.

**Why Profile and Experts together.** They share `UserProfiles`, `UserSkills`, `UserBadges`, `ReputationEvents` and four UI fragments. Built separately, you'd write the skill-bar component twice and probably model reputation twice. Built together, Experts is "Profile, but for someone else, read-only" — which is a two-day module instead of a five-day one.

**Why Search second-to-last.** It reads from every other lot's tables. Build it before those tables are stable and you rewrite each provider as the schemas settle.

**Why Dashboard last.** It is a pure consumer with zero data of its own. Every number on it comes from somewhere else. Built first, it is 100% mock data — and mock data that never gets replaced is how a demo becomes a lie in front of the client.

### 10.3 Definition of done, per module

Do not move to the next module until all six are true:

1. Entities deploy cleanly (`cds watch` starts with no warnings)
2. Every endpoint returns correct data for **at least two different roles**
3. Every endpoint returns **403 for a role that shouldn't have access** — verified via HTTP client, not by checking that the button is hidden
4. The UI renders correctly at 360px, 768px and 1440px
5. Every visible string comes from `i18n.properties`
6. The code is on a feature branch with a PR the other two devs can review

---

## 11. Code generation rules for our sessions

When I generate code for you, I'll hold to these. Call me out if I don't.

### 11.1 Quality bar
- Production-quality, no placeholder logic. If something genuinely can't be built yet, it becomes an explicit interface with a mock implementation and an entry in `TODO-INTEGRATION.md` — never a silent `return null`.
- SOLID applied where it earns its keep: Strategy for dashboards and search, Dependency Inversion for cross-lot providers, Single Responsibility for the handler/domain split. Not abstraction for its own sake — a 5-line function doesn't need a factory.
- No duplicated logic. If the same rule appears in two files, it moves to `domain/` and both call it.
- Business logic never lives in a handler or a controller. Handlers translate HTTP to domain calls; controllers translate clicks to OData calls.
- Meaningful names, in English, for code. French for user-facing strings, in i18n files.
- Comments explain *why*, not *what*. `// Denormalised so the Experts grid can sort on it without a join` is useful. `// increment counter` is noise.
- Every assumption is stated *before* the code, not buried in it.

### 11.2 CAP-specific
- Handlers use `async init()` and bind private methods — matching Lot 1's style exactly
- ESM imports, never `require()` (the project is `"type": "module"`)
- CQL (`SELECT.from`, `INSERT.into`) over raw SQL — it's portable between SQLite and HANA
- `@restrict` on every entity in every service. No exceptions.
- Never trust `req.data` for identity — always `req.user.id`
- Multi-step writes go inside a transaction

### 11.3 UI5-specific
- XML views, no `new sap.m.Button()` in controllers
- Every controller extends `BaseController`
- Fragments for anything used more than once
- All strings via `i18n`
- Formatters in `model/formatter.js`, not inline expression binding for anything non-trivial
- Routing in `manifest.json`, navigation via `getRouter().navTo()`

### 11.4 Mentoring format — before every implementation
1. **What** we're building
2. **Why** it exists (which requirement, from the spec or the design)
3. **How** it fits the architecture (which layer, what it depends on)
4. **Common beginner mistakes** for this specific thing
5. **SAP best practice** and why SAP recommends it
6. Then the code, then a walkthrough of it
7. Then I stop and wait for your confirmation

---

## 12. What I need from you before writing any code

### 12.1 Blocking questions

| # | Question | Why it blocks |
|---|---|---|
| **Q1** | **Source of truth: spec or design?** They diverge substantially (§2). My default assumption: *the design is authoritative for UI and features, the spec is authoritative for security, architecture and non-functional requirements.* Confirm or correct. | Determines ~40% of the entities |
| **Q2** | **Is gamification in scope?** (reputation, badges, levels, certifications, rewards — C2). It's absent from the spec but central to three of my modules. | Profile, Experts and Dashboard are mostly this |
| **Q3** | **Rooms vs Topics vs Tags — three entities or two?** (C1) Your colleague merged Rooms and Topics. The design separates them. | Changes the schema, and it's *his* file |
| **Q4** | **Semantic/vector search: internship deliverable or target-solution scope?** (C4) | Search is 4 days as keyword, ~10 as vector |
| **Q5** | **Confidentiality classification: in scope?** (C5) Spec requires it; design shows no UI for it. | Adds a field + filtering to KC and Search |
| **Q6** | **Which lot owns Questions, Rooms, Topics, Tags, Certifications, Rewards, Validation?** I depend on all of them and none are in my list. | Determines what I mock vs what I build |
| **Q7** | **One UI5 app with routing, or seven separate apps?** (§6.3) My recommendation is one, but Lot 1 already ships `app/feed`. | Restructuring later is expensive |

### 12.2 Team decisions to raise (not yours alone)

| # | Proposal | To whom |
|---|---|---|
| **T1** | Split `db/schema.cds` into per-lot files + use `extend` | All three devs |
| **T2** | Fill `xs-security.json` with the scopes in §8.1 | All three + supervisor |
| **T3** | Extend `Comments` with `knowledgeItem` rather than creating a second comment entity | Lot 1 dev |
| **T4** | Everyone uses `srv/lib/notify.js` instead of writing to `Notifications` directly | Lots 1 & 3 |
| **T5** | Remove `SAP-Basis-knowledge-center.zip` / `.tar.gz` from the repo, add to `.gitignore` | Lot 1 dev |
| **T6** | Branch-per-feature + PR review; protect `main` | All three |
| **T7** | Add an approuter + `html5-apps-repo` module to `mta.yaml` before the first BTP deploy | Whoever owns deployment |

### 12.3 My proposed first step

Once Q1–Q7 are answered, I'd start with **Step 2 + Step 3 for the Notifications module only** — the RBAC skeleton plus one entity — so you get a complete, working, secured vertical slice in your hands within a day or two, before we scale the pattern to the other six modules.

---

## Appendix A — Design screens by lot

| Screen | Lot | Notes |
|---|---|---|
| Feed | 1 | ✅ Built (schema, service, handler, UI5 app) |
| Questions | 3? | Q&A — conflicts with the spec's "Issues" (C3) |
| Rooms | 3? | Collaboration spaces — conflicts with colleague's schema (C1) |
| Topics (Sujets) | 3? | Knowledge taxonomy — I depend on it |
| Tags | 3? | I depend on it |
| Validation | 3? | Manager approval queue — feeds my Manager dashboard |
| Rapports | 3? | Manager KPIs — overlaps my Dashboard |
| HR | 3? | Overlaps my HR dashboard |
| Rewards | 3? | Rewards catalogue — surfaces on my HR dashboard |
| Certifications | 3? | Surfaces on my Profile page |
| Admin | 3? | Overlaps my Admin dashboard |
| Room Stage | 3? | Intern space — linked from my Intern dashboard |
| Rapports de Stage | 3? | Linked from my Intern dashboard |
| Dépôt de Projet | 3? | Linked from my Intern dashboard |
| **Search** | **2** | Mine |
| **Experts** | **2** | Mine |
| **Knowledge Center** | **2** | Mine |
| **Notifications** | **2** | Mine |
| **Profile** | **2** | Mine |
| **Dashboard** | **2** | Mine — 5 role variants |
| Index | — | Design navigation page, not a real screen |

**Observation worth raising with your supervisor:** Lot 3 as implied here is 14 screens against Lot 1's 1 and my 6. The workload split may need rebalancing — or Lot 1's scope is larger than the single committed module suggests.

## Appendix B — Design values to reuse verbatim

Straight from the mock's code. Use these as CSV seed data so your local environment looks like the design from day one.

**Users:** Sami Ben Youssef (SB, `#749dc4`, Consultant SAP BTP, Solutions SAP, 1240 pts, 9 badges) · Nadia Ferchichi (NF, `#597ea3`, Consultante SAP HANA, Solutions SAP, 2140 pts, 9 badges, 64 contributions) · Karim Trabelsi (KT, `#7e9cb8`, Développeur Cloud Foundry, Développement Digital, 1875 pts, 7 badges, 51 contributions) · Ines Chaabane (IC, `#416180`, UX Designer SAP Fiori, Solutions SAP, 1520 pts, 6 badges, 38 contributions) · Yassine Gharbi (YG, `#749dc4`, Architecte Intégration, Gestion des données, 980 pts, 4 badges, 22 contributions)

**Departments:** Solutions SAP · Développement Digital · Gestion des données

**Topics:** SAP BTP · Solutions SAP · Développement Digital

**Tags:** Java · Spring Boot · SAP BTP · Angular · Docker · OAuth · JWT · CI/CD · CAP · HANA · CDS · OData · SAP Fiori · Cloud Foundry · Reporting · Performance · XSUAA

**KC categories:** Articles · Documentation · Rapports · Tutoriels · Bonnes pratiques · Questions résolues · FAQ · Modèles

**Badges:** Contributeur Expert · Mentor · Top réponse · Réponse acceptée x12 · Contributeur actif · Design System Owner · Top contributeur · Question bien posée · Article publié

**Reputation event labels (with points):** Publication approuvée +50 · Réponse acceptée +25 · Documentation validée +100 · Commentaire utile +30 · Article publié +75

**Expertise levels:** Débutant (<250) · Contributeur (≥250) · Expert (≥600) · Spécialiste (≥1000) · Master (≥1500)

**Rewards:** Sac ordinateur 5000 pts · Ordinateur portable 10000 pts · Smartphone 20000 pts

**Platform totals (Admin dashboard):** 178 users · 156 actifs · 5 rôles · 1240 publications · 386 questions · 214 KC items · 18 rooms actives
