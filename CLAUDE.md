# CLAUDE.md — AYMAX Knowledge Hub

Project memory for Claude Code. Read this fully before your first action in a session.

---

## 🔴 HARD SAFETY RULES — read before every command

This repository deploys to a **SAP BTP account shared with the project supervisor**, who has
sensitive projects on other subaccounts and dev spaces. A wrong command destroys someone
else's work.

### Never run these. Not with a flag, not "just to test", not if I ask you to.

```
cf delete-service ...              cf delete-space ...        cf delete-org ...
cf undeploy ... --delete-services  cds deploy --to hana       cf unbind-service ...
git push --force                   git push origin main       git reset --hard origin/main
rm -rf (anywhere outside /tmp)     npm publish
```

### Always do this before ANY cf/mta/deploy command

```bash
cf target        # print org + space, and STOP. Ask me to confirm it is MY dev space.
```

If `cf target` is not shown in the current session, or the space is not mine, refuse the
command and tell me why. **Never assume a previous confirmation still holds.**

### Development happens locally, not on BTP

```bash
npm install
cds watch        # CAP + in-memory SQLite + serves app/ — no cloud, no risk
```

Deployment to BTP is a **manual step I perform myself**, at milestones only. Propose the
commands, print them for me to run, and do not execute them.

### Permission mode

Work in **Manual** or **Plan** mode. Do not request Bypass permissions on this repo.

### Git

- **Never commit to `main`, never push to `main`.** My personal integration branch is `ons`.
- Module work happens on `feature/lot2-<module>`, branched **off `ons`**, merged **back into
  `ons`**. `ons` reaches `main` only through a Pull Request reviewed by a colleague.
- Branch chain: `feature/lot2-<module>` → `ons` → `main`. Never skip a step.
- Never `git push --force`, never rewrite history.
- Never `git add .` — stage named files so build artefacts don't sneak in.
- Never commit secrets: `default-env.json`, `.cdsrc-private.json`, `*.sqlite`, `.env`,
  service keys, tokens. If you see one, stop and tell me.
- Never leave HEAD detached across a work session. If a checkout leaves HEAD detached,
  stop and get onto a named branch (`ons` or a `feature/lot2-*` branch) before writing
  or committing anything.

---

## 1. What this project is

**AYMAX Knowledge Hub** — an internal SAP knowledge-management platform for the SAP Technical,
Functional and Basis departments at AYMAX Tunisie. Summer engineering internship project.

**Stack (imposed by the client, not negotiable):** SAP BTP · SAP Fiori / SAPUI5 freestyle ·
Node.js with CAP · SAP HANA Cloud · SAP IAS / XSUAA · Git.

**Three developers, three lots.** I own **Lot 2**.

| Lot | Owner | Scope |
|---|---|---|
| 1 | Colleague | Feed (Fil d'actualité) — already built |
| **2** | **Me** | **Search · Experts · Knowledge Center · Notifications · Profile · Dashboard** |
| 3 | Colleague | Questions, Rooms, Topics, Tags, Validation, Admin, HR, Rewards, Certifications, intern pages, AI Security Guardian |

---

## 2. My scope, precisely

| Module | Route | Service | Status |
|---|---|---|---|
| Notifications | `#/notifications` | `/odata/v4/notifications` | 🟡 In progress (schema, service, handler, tests committed on `ons`) |
| Profile | `#/profile` | `/odata/v4/people` | ⬜ Not started |
| Experts | `#/experts`, `#/experts/{id}` | `/odata/v4/people` | ⬜ Not started |
| Knowledge Center | `#/knowledge`, `#/knowledge/{id}` | `/odata/v4/knowledge` | ⬜ Not started |
| Search | `#/search?q=&type=` | `/odata/v4/search` | ⬜ Not started |
| Dashboard | `#/dashboard` (5 role variants) | `/odata/v4/dashboard` | ⬜ Not started |

**Keep this table updated as we complete modules.**

---

## 3. File ownership — what I may and may not touch

### ✅ Mine to create and edit freely
```
db/people.cds  db/knowledge.cds  db/notifications.cds  db/data/*.csv
srv/{knowledge,people,notification,search,dashboard}-service.{cds,js}
srv/handlers/{Knowledge,People,Notification,Search,Dashboard}Handler.js
srv/domain/**   srv/repositories/**   srv/lib/**   srv/middleware/**
app/{knowledge,experts,notifications,profile,search,dashboard}/**
app/shared/**   test/**   docs/**   TODO-INTEGRATION.md
```

### ⛔Not allowed

Do not redesign or reimplement another developer's module.

Do not:

rewrite Feed features
refactor Feed architecture
rename Feed APIs
change Feed business rules
remove existing functionality

If a modification exceeds normal integration work, stop and show me the exact change and tell me it needs team agreement first.

### ⚠️ Shared — propose a diff, never edit silently
```
package.json    mta.yaml    xs-security.json    .gitignore    README.md
```
For these: show me the exact change and tell me it needs team agreement first.

### The `extend` rule

To add fields to a Lot 1 entity, **never open his file**. Use CDS extension in mine:

```cds
// db/people.cds — my file, zero merge conflicts
using { aymax.knowledgehub as kh } from './schema';
extend kh.UserProfiles with {
  bio : String(1000);
  skills : Composition of many UserSkills on skills.user = $self;
}
```

---

## 4. Conventions inherited from Lot 1 — follow exactly

| Thing | Value |
|---|---|
| CDS namespace | `aymax.knowledgehub` |
| Modules | **ESM** (`"type": "module"`). `import`/`export`. **Never `require()`.** |
| Service file | `srv/<name>-service.cds` + `srv/<name>-service.js` (3 lines, wires the handler) |
| Handler | `srv/handlers/<Name>Handler.js`, `class X extends cds.ApplicationService`, `async init()`, private methods prefixed `_` |
| Service path | `@path: '/odata/v4/<name>'` |
| OData | V4 |
| UI5 | **Freestyle** (XML views + JS controllers). **Not Fiori Elements.** |
| UI5 app id | `aymax.<module>` in `app/<module>/webapp/` |
| UI5 min version | 1.120.0 — do not use controls newer than this |
| Theme | `sap_horizon` / `sap_horizon_dark` |
| Query language | CQL (`SELECT.from`, `INSERT.into`) — portable SQLite ↔ HANA. Not raw SQL. |
| UI language | French. **All strings in `i18n.properties`** — Lot 1 hardcoded his; do not copy that. |
| Code language | English identifiers, English comments. |

---

## 5. Decisions already made — do not re-litigate

Full reasoning in `docs/lot2-analysis.md` §2. Resolved:

| ID | Decision |
|---|---|
| **C1** | `Rooms`, `Topics`, `Tags` are **three separate entities**. A Room has one Topic and ≥1 Tag. I create `Topics` + `RoomTags` in **my** file and `extend kh.Rooms` additively — Lot 1's `Rooms` entity definition is **not** rewritten. |
| **C2** | **The design is authoritative** for features, UI, labels and business rules. The cahier des charges is authoritative for security, architecture and non-functional requirements. |
| **C3** | The design's `Questions` model wins over the spec's `Issues`. Troubleshooting = a Question with `kind: 'troubleshooting'` plus optional `symptoms` / `probableCause` / `resolution` / `severity` / `sapComponent`. One entity, one discriminator. (Lot 3 builds it; my `promoteQuestion` depends on the shape.) |
| **C4** | Search is **keyword now** (phase 1), behind a `SearchStrategy` interface so vector/semantic search can slot in later without touching callers. |
| **C5** | Confidentiality **is in scope**. `confidentiality : String enum { public; internal; confidential } default 'internal'` on `KnowledgeItems`, enforced in `@restrict where` and in every search provider. |
| **C6** | AI Security Guardian: **build the seam, not the feature.** `submitForReview()` calls an injected `SecurityGuardian` interface; ship `NoOpSecurityGuardian` returning risk 0. Implement the spec §7.7 decision rules (0–39 publish · 40–69 warn · 70–100 block) in my workflow code now. |
| **C7** | **No role switcher — with one explicit, temporary, local-only exception (2026-08).** Real authorization still comes from the XSUAA token via `req.user.is()`, and no `@restrict`/`@requires` anywhere reads a client-supplied value directly. But the shared shell (`app/webapp/`) now has a dev-only "Rôle" dropdown (`model/devRole.js`, wired in `Component.js`/`App.controller.js`) that tags every OData request with a plain `X-Dev-Role` header; `srv/server.js` (registered on CAP's `bootstrap` event, before its own auth middleware runs) rewrites that into a real Basic-Auth login for one of the five mocked users (`sami`/`nadia`/`rh`/`admin`/`stagiaire`) — the exact same effect as opening a private window and logging in as a different mocked user, just without the extra window; every `@restrict` check still runs for real against that role. It has zero effect once the real `xsuaa` profile is active (`cds.env.profiles` never includes `'production'` locally, and these five users only exist in `package.json`'s `[development]` mocked-auth config), and it must be removed — or at minimum re-reviewed — before that rollout (`TODO-INTEGRATION.md` I-25). Feed (a separate app/Component) carries the same preview via its own `app/feed/webapp/model/devRole.js`, which only reads the `sessionStorage` key the shell's dropdown writes (same origin/tab survives the plain page navigation between them) - it has no dropdown of its own. |

---

## 6. Architecture — which layer does what

```
UI5 (XML views, controllers, fragments)   → no business rules. A disabled button is a hint.
    ↓ OData V4
CDS service (.cds)                        → authorization DECLARED here (@requires/@restrict)
    ↓
Handler (srv/handlers/)                   → THIN. ~10 lines/method. Hooks → domain calls.
    ↓
Domain (srv/domain/)                      → business logic. NO `req` object. Unit-testable.
    ↓
Repository (srv/repositories/)            → all CQL lives here
    ↓
CDS entities (db/*.cds) → SQLite locally, HANA Cloud in production
```

**Rule:** if a handler method exceeds ~15 lines, the logic belongs in `domain/`.

### Patterns in use
- **Strategy** — Dashboard (one per role), Search (one per content type, one per DB backend)
- **Dependency Inversion** — `srv/domain/dashboard/providers/*` mock what Lots 1 & 3 own
- **Facade** — `srv/lib/notify.js` is the single way any lot raises a notification
- **Event ledger** — `ReputationEvents` is append-only; `UserProfiles.reputation` is a
  recomputable cache, never the source of truth

---

## 7. Security rules — non-negotiable, every module

1. **Every entity in every service carries `@restrict`.** No exceptions, no "add it later".
2. **Identity comes from `req.user.id`.** Never from `req.data`, never from a header the
   client controls.
3. **Row-level security uses `where:`**, evaluated in SQL:
   - Notifications: `where: 'recipient.userID = $user'`
   - Knowledge: `where: "status = 'approved' or contributors.user.userID = $user"`
4. **Whitelist updatable fields in the projection**, don't validate in the handler.
   `MyProfile` exposes `bio`, `position`, `avatarColor`, `displayName` — and nothing else.
   `reputation`, `expertiseLevel`, `isExpert`, `userID` must be unreachable via PATCH.
5. **`getDashboard()` takes no role parameter.** The role is derived server-side.
6. **Search facet counts are computed after authorization filtering**, never before —
   otherwise the tab count leaks the existence of documents the user cannot see.
7. **Every search provider applies its own read restrictions.** Search is the one feature
   that crosses every boundary, so it is where leaks happen.

### Roles and scopes

Roles: `Employee` · `Intern` · `DepartmentManager` · `HR` · `Admin`
Scopes: `Knowledge.{Read,Write,Approve}` · `People.{Read,Admin}` · `Dashboard.{Employee,Manager,HR,Admin,Intern}`

**Interns have `Knowledge.Read` but not `Knowledge.Write`** — that is the design's disabled
"Contribuer" button, enforced where it counts.

Local testing uses CAP mocked users (`sami`=Employee, `nadia`=DepartmentManager, `rh`=HR,
`admin`=Admin, `stagiaire`=Intern). Any password.

---

## 8. Build order

Do not jump ahead. Each module is a complete vertical slice before the next begins.

```
0. Setup & branch                    ✅
1. Contracts agreed with team        ⬜   (schema split, Comments extend, notify(), scopes)
2. RBAC foundation                   ⬜   xs-security.json + mocked users   ← DO NOT SKIP
3. Lot 2 entities + CSV seed data    🟡   (notifications schema exists — verify others)
4. NOTIFICATIONS  (full slice)       🟡   schema/service/handler/tests committed — verify against DoD (§9)
5. PROFILE + EXPERTS  (together)     ⬜   shared entities and fragments
6. KNOWLEDGE CENTER                  ⬜   largest
7. SEARCH + standalone page          ⬜   reads everyone's tables
8. DASHBOARD                         ⬜   pure consumer — build LAST
9. Integration: replace mocks        ⬜
10. Tests, deploy, document          ⬜
```

**Why RBAC at step 2:** authorization in CAP is declarative annotations on entities.
Retrofitting it means rewriting every projection, handler and test. Born-secure costs nothing.

**Why Notifications first:** one entity, one restriction, one list. Learn CAP + UI5 + routing +
i18n + OData binding where a mistake costs an hour, not a week.

**Why Dashboard last:** every number on it comes from another module.

---

## 9. Definition of done — a module isn't finished until all six are true

1. `cds watch` starts with no warnings
2. Every endpoint returns correct data for **at least two different roles**
3. Every endpoint returns **403 for a role that shouldn't have access** — verified with an
   HTTP client, not by checking that a button is hidden
4. UI renders correctly at 360px, 768px and 1440px
5. Every visible string comes from `i18n.properties`
6. On a feature branch, in a PR the other two devs can review

---

## 10. Code quality rules

- **No placeholder logic.** If something can't be built yet, it becomes an explicit interface
  with a mock implementation **and an entry in `TODO-INTEGRATION.md`** — never a silent `return null`.
- **No duplicated logic.** Same rule in two files → move it to `domain/`, both call it.
- **Meaningful names.** No `data`, `temp`, `handleIt`, `x`.
- **Comments explain *why*, not *what*.** `// Denormalised so the Experts grid sorts without a
  join` is useful. `// increment counter` is noise.
- **State assumptions before the code, not inside it.**
- **No N+1 queries.** Fetch related rows in one query and index them in a `Map`/`Set`.
  See `FeedHandler._enrichPosts` for the correct pattern.
- **Multi-step writes go in a transaction.**

### UI5 specifics
- XML views. No `new sap.m.Button()` in controllers.
- Every controller extends `BaseController` (nav, i18n, model helpers).
- Anything used twice becomes a fragment.
- Formatters in `model/formatter.js`, not inline expression binding for anything non-trivial.
- Routing in `manifest.json`; navigate via `getRouter().navTo()`.
- Semantic colours (`Success`/`Warning`/`Error`/`Information`/`None`). **Never hex.**
- Standard spacing classes (`sapUiSmallMargin`, …). **Never inline `style=`.**
- `sap.m.MessageBox.error` for failures, `MessageToast` for successes. Never `alert()`.
  Never swallow an error.
- Relative dates via `DateFormat.getDateTimeInstance({relative:true})` — don't hand-write.
- `tooltip` on every icon-only button; `ariaLabelledBy` on interactive controls.

---

## 11. How I want you to work with me
## Integration authority

For Lot 2 implementation, you are explicitly authorized to modify existing application files across other lots when those changes are strictly necessary for integration.

Examples include:

- routing
- dashboard navigation
- notification bell
- shared header
- shell
- layout
- manifest.json route registration
- shared components

Do not refuse these changes solely because another developer originally created the file.

Instead:

1. explain why the modification is required,
2. keep it as small as possible,
3. preserve existing functionality,
4. clearly identify every modified file.

Only refuse if the requested change would redesign, replace, or break another developer's feature rather than integrate with it.

I am an **intern and a beginner in SAP**. Act as a senior mentor, not a code generator.

**Before every implementation, explain in this order:**
1. **What** we are building
2. **Why** it exists — which requirement, from the design or the spec
3. **How** it fits the architecture — which layer, what it depends on
4. **Common beginner mistakes** for this specific thing
5. **The SAP best practice** and why SAP recommends it

Then write the code. Then walk me through it. **Then stop and wait for my confirmation
before moving to the next thing.**

**Work in small steps.** One module → analyse → design → confirm → backend → explain →
confirm → frontend → explain → confirm. Do not generate three modules in one turn.

**Push back on me.** If I ask for something that contradicts §3, §5, §7 or the safety rules,
say so and explain why instead of complying.

**If the design and the spec disagree** on something not already settled in §5, stop and ask
me which is the source of truth. Don't guess.

---

## 12. Where to find things

| Need | File |
|---|---|
| Full architecture, entities, 40 API endpoints, Fiori control mapping | `docs/lot2-analysis.md` |
| Exact UI structure, labels, mock data, business rules per screen | `docs/design/<Page>.md` |
| Original client specification (French) | `docs/cahier-des-charges.pdf` |
| What is still mocked and must be replaced at integration | `TODO-INTEGRATION.md` |

`docs/lot2-analysis.md` section map: §2 conflicts · §3 dependencies & contracts · §4 module
decomposition · §5 architecture · §6 folder structure · §7 CDS entities · §8 API + RBAC ·
§9 Fiori controls per page · §10 build order.

---

## 13. Common commands

```bash
npm install                 # dependencies
cds watch                   # dev server, SQLite, http://localhost:4004
cds watch --profile hybrid  # local server against a real HANA binding (ask me first)
npm test                    # tests

# one-time: create my personal integration branch
git checkout main && git pull origin main
git checkout -b ons && git push -u origin ons

# per module
git checkout ons && git pull origin ons
git checkout -b feature/lot2-notifications      # branch OFF ons
git add <named files>                            # never `git add .`
git commit -m "feat(lot2-notifications): ..."
git push -u origin feature/lot2-notifications

# finish a module: fold it into ons
git checkout ons && git merge feature/lot2-notifications && git push

# stay current with the team (do this daily)
git fetch origin && git checkout ons && git merge origin/main && git push
```

Commit format: `feat(lot2-notifications): add read restriction to Notifications projection`
Types: `feat` · `fix` · `refactor` · `test` · `docs` · `chore`
