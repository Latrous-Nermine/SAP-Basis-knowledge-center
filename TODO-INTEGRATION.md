# TODO — Integration points (Lot 2)

Every mock, stub and cross-lot assumption in Lot 2. **This file must be empty before the final
demo.** Add a row the moment you write a mock — not later, because later never comes.

| ID | What is mocked | File | Owned by | Replace when | Status |
|----|----------------|------|----------|--------------|--------|
| I-01 | `SecurityGuardian.analyze()` returns risk 0 (decision C6) | `srv/domain/security/NoOpSecurityGuardian.js` | Lot 3 (AI Security Guardian) | The real analyzer exists | ⬜ Open |
| I-02 | Manager dashboard "Validations en attente" count | `srv/domain/dashboard/providers/ValidationProvider.js` | Lot 3 (Validation) | Validation queue entity exists | ⬜ Open |
| I-03 | ~~Manager dashboard "Activité des rooms"~~ — built for real (2026-08-06): Rooms/Posts.room/followersCount already exist in Lot 1's schema, no Lot 3 dependency after all | `srv/domain/dashboard/providers/RoomProvider.js` | Me | — | ✅ Resolved |
| I-04 | Manager dashboard "Suivi des questions" | `srv/domain/dashboard/providers/QuestionProvider.js` | Lot 3 (Questions) | Questions entity exists | ⬜ Open |
| I-05 | Search provider for Questions | `srv/domain/search/providers/QuestionSearchProvider.js` | Lot 3 | Questions entity exists | ⬜ Open |
| I-06 | Search provider for Rooms | `srv/domain/search/providers/RoomSearchProvider.js` | Lot 3 | Rooms split from Topics (C1) | ⬜ Open |
| I-07 | `promoteQuestion()` — reads a Question to create a KC item | `srv/domain/KnowledgeWorkflow.js` | Lot 3 | Questions entity + `kind` discriminator (C3) agreed | ⬜ Open |
| I-08 | HR dashboard rewards catalogue | `srv/domain/dashboard/providers/RewardProvider.js` | Lot 3 (Rewards) | Rewards entity exists | ⬜ Open |
| I-09 | Intern dashboard: reports + project deposit counts | `srv/domain/dashboard/providers/InternProvider.js` | Lot 3 (intern pages) | Those entities exist | ⬜ Open |
| I-10 | `Topics` entity created in Lot 2's file; Lot 1's `Rooms` still doubles as Topics | `db/lot2.cds` | Team (C1) | Data migration agreed at merge | ⬜ Open |
| I-11 | `extend Comments with { knowledgeItem }` — implemented, needs Lot 1's sign-off (Contract B) | `db/lot2.cds` | Lot 1 | He confirms | ⬜ Open |
| I-12 | `srv/lib/notify.js` — Lots 1 and 3 must adopt it (Contract C); `submitForReview` doesn't notify managers yet either | `srv/lib/notify.js` | Lots 1 & 3 | Both call it instead of INSERTing | ⬜ Open |
| I-13 | `xs-security.json` scopes not yet agreed by the team (T2) | `xs-security.json` | Team | PR merged | ⬜ Open |
| I-14 | Semantic/vector search — phase 2 behind `SearchStrategy` (C4) | `srv/domain/search/strategies/` | Me, later | If it becomes a deliverable | ⬜ Open |
| I-15 | No approuter / html5-apps-repo in `mta.yaml` — UI5 apps not deployable (T7) | `mta.yaml` | Team | Before first UI deploy | ⬜ Open |
| I-16 | Knowledge Center "Contribuer" button can't be role-aware client-side — always enabled, server enforces the real 403. `PeopleService` (`GET /People('{userID}')`, `role` field) now exists, so this is unblocked; the Knowledge Center view itself hasn't been wired to consume it yet | `app/knowledge/webapp/view/KnowledgeList.view.xml` | Me | Someone wires the client-side check | 🟡 Unblocked |
| I-17 | Profile "Activité" feed has no "answered question" entry — assembled from KnowledgeContributors/Comments/KnowledgeAttachments/Follows only | `srv/people-service.js` (`getActivity`) | Lot 3 (Questions) | Questions entity exists | ⬜ Open |
| I-18 | `ReputationEvents` ledger is seed data only — no awarding workflow writes to it yet, so it can drift from `UserProfiles.reputation` (which stays authoritative for the total shown) | `db/lot2.cds`, `db/data/aymax.knowledgehub-ReputationEvents.csv` | Me, later | A badge/point-awarding workflow is built | ⬜ Open |
| I-19 | Experts "Poser une question" button creates a Lot 1 `Post` (`type: 'question'`) instead of a real Question — Lot 3's Questions entity doesn't exist yet | `app/experts/webapp/controller/ExpertsList.controller.js` (`onAskQuestionPress`) | Lot 3 (Questions) | Questions entity exists | ⬜ Open |
| I-20 | `availability`/`yearsOfExperience`/`technologies` (Experts module) are seed-data only — `PeopleService` has no write endpoint at all yet, so these aren't user-editable | `db/lot2.cds`, `srv/people-service.cds` | Me, later | A `MyProfile` PATCH endpoint is deliberately added (own milestone, not silently bundled into another module) | ⬜ Open |
| I-21 | HR dashboard "Évolution des compétences" (quarter-over-quarter skill deltas) — no historical/time-series tracking model exists anywhere in this schema, so this always returns empty | `srv/domain/dashboard/strategies/HRDashboardStrategy.js` | Me, later | A skill-snapshot-over-time model is designed (own milestone — not a Lot 3 dependency) | ⬜ Open |
| I-22 | HR dashboard "Objectifs" — no Objectives entity exists anywhere in the schema | `srv/domain/dashboard/strategies/HRDashboardStrategy.js` | Team | An Objectives entity + ownership is agreed | ⬜ Open |

## How to use this file

- **Add a row before you write the mock**, with the file path you're about to create.
- When you resolve one, change the status and note the commit.
- Review it at the start of build-order step 9 (Integration).
- Bring it to every team sync — rows I-10 to I-15 are things other people have to act on.
