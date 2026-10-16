# Backend execution plan

Accepted initial scope: users, pods/members, and games/players CRUD based on the supplied SQL migration, SQLAlchemy ORM, PostgreSQL, and `/api/v1` snake_case contracts. Authentication and client migration are deferred. See [requirements](REQUIREMENTS.md) and [testing](TESTING.md).

## Next

No additional domain work is active. Pod-admin APIs, authentication, broader game lifecycle features, and production/data cutover require future scope decisions.

## In progress

None.

## Done

- [x] **TASK-013 — Completed-game history.** Continued with the proposed scope: optional `completed` filter on GET `/api/v1/games`, combined with existing pod filter, pagination, and ascending ID ordering. Game responses embed the nullable result. Verified 2026-10-16: all 20 tests pass against PostgreSQL, covering wins, draws, unfinished games, combined filters, pagination, invalid query values, and OpenAPI. No migration or client changes.

- [x] **TASK-012 — Game-result recording and retrieval.** User approved winner by game-player ID, explicit null for draws, identical repeats returning the original result, conflicting repeats returning 409, and player replacement blocked after completion. Implemented POST/GET `/api/v1/games/{game_id}/result` on the existing schema. Verified 2026-10-16: all 18 tests pass against PostgreSQL, including concurrent result submissions, result/player-replacement races, validation, rollback, cascades, and OpenAPI. No schema migration required.

- [x] **Initial CRUD final verification and HTTPX2 dependency migration.** Verified 2026-10-16: refreshed stale lockfile metadata, `uv sync --locked` passed, all 11 tests passed against isolated PostgreSQL schemas without warnings, generated OpenAPI CRUD methods match the documented contract, and Starlette's test client uses HTTPX2.
- [x] **TASK-002 — Resolve initial MVP and contract choices.** User selected users, pods, and games; supplied the PostgreSQL schema; chose SQLAlchemy ORM and `/api/v1`; explicitly deferred authentication and client migration. Contracts use snake_case, ID ordering, and bounded lists. Legacy feature scope, winner/completion policies, auth provider, and production/data cutover are deferred to later tasks.
- [x] **TASK-003 — Persistence foundation for the initial CRUD API.** SQLAlchemy ORM maps the seven supplied tables with Psycopg as driver. Request-scoped transactions commit before responses and roll back failures. Explicit SQL migrations use a checksum ledger; no schema changes occur on app startup. Actual migration and ORM mappings verified in isolated PostgreSQL schemas. Production/data cutover remains deferred.
- [x] **TASK-011 — Users, pods, and games CRUD.** Requirements: REQ-010–REQ-014. Typed create/list/read/update/delete routes, nested member updates, same-pod game-player checks, duplicate and foreign-key conflicts, bounded pagination, atomic updates, and deletion cascades verified by PostgreSQL API tests. Auth and frontend changes excluded per user instruction.
- [x] **TASK-001 — Minimal independently runnable FastAPI foundation.** Requirements: REQ-001–REQ-003. Python 3.12 selected; uv manifest and lockfile added, including Poetry in development dependencies. App factory and `/api/health` run independently of client/database/auth. Locked installation verified; 2 API tests passed; live health and OpenAPI requests returned 200; shutdown verified. Commands and dependency purposes documented in README and testing docs. Frontend unchanged. `uv.lock` is ready for version control with the existing uncommitted backend files.
- [x] **TASK-000 — Initialize factory documentation.** Requirements: REQ-001–REQ-003. Dependencies: repository inspection. Acceptance: all nine requested Markdown files exist; links and requirement/task references validated; evidence separated from proposals; no implementation, dependency installation, or infrastructure changes performed.

## Blocked / conditional roadmap

These tasks remain deferred until explicitly activated by the user. The initial CRUD API does not depend on authentication.

- [ ] **TASK-004 — Verified identity and ownership.** Requirements: REQ-009. Dependencies: TASK-002, TASK-003. Acceptance: provider verification tested for valid/invalid credentials; identity cannot be forged through request fields; dependency usable by protected routes; tests for cross-user access are required as routes land.
- [ ] **TASK-005 — Game lifecycle and history.** Requirements: REQ-004. Dependencies: TASK-003; TASK-004 if games are private. Acceptance: create/detail/history/completion contract tests; exact participant membership, winner policy, atomic writes, pagination, and repeated/concurrent completion behavior verified.
- [ ] **TASK-006 — Statistics.** Requirements: REQ-005. Dependencies: TASK-005. Acceptance: fixture-derived player/commander/color/combination results match documented rules; no active games included; empty/colorless inputs covered; ownership scope follows approved game policy.
- [ ] **TASK-007 — Scryfall adapter and routes.** Requirements: REQ-008. Dependencies: TASK-001, TASK-002; TASK-004 if protected. Acceptance: finite timeouts, documented upstream failures, bounded/defined print pagination, and mocked API tests; rate/retry policy documented without live calls in tests.
- [ ] **TASK-008 — Decks and card import.** Requirements: REQ-006, REQ-009. Dependencies: TASK-003, TASK-004; TASK-007 only if server-side card resolution is approved. Acceptance: owner CRUD and nested card tests; card/deck membership checks; input bounds; atomic bulk import; quantity/duplicate policy documented and tested.
- [ ] **TASK-009 — Inventory.** Requirements: REQ-007, REQ-009. Dependencies: TASK-003, TASK-004; TASK-007 only if printing resolution is required. Acceptance: owner CRUD, quantity/condition/printing validation, safe partial updates, price precision policy, and non-owner denial verified.
- [ ] **TASK-010 — Deployment and cutover.** Requirements: REQ-001 and accepted domain requirements. Dependencies: implemented MVP; confirmed hosting target and migration policy. Acceptance: backend-specific deploy/runbook, readiness/shutdown/CORS/auth settings, migration rehearsal and rollback plan if preserving data, external HTTP smoke checks, and measured performance against an agreed dataset/target. Do not deploy or migrate live data without authorization.

Split activated domain tasks into small reviewable steps before coding. Mark done only after verification; [decisions](DECISIONS.md) records material choices.
