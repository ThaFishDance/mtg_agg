# MTG Aggregator backend requirements

## Status and evidence

The user confirmed a FastAPI backend with users, pods, and games CRUD, based on `migrations/v001__create_initial_tables.sql`, using SQLAlchemy ORM and PostgreSQL. Authentication is explicitly deferred. `/api/v1` and snake_case JSON are accepted; client updates happen later. Python 3.12 and uv are configured. CRUD and integration tests are implemented; deployment and legacy-data cutover remain deferred. The existing Next.js application is a reference, not the new backend.

Working project name: MTG Aggregator (inferred from the repository name). Target users are Commander players managing matches, decks, and owned cards (inferred from existing pages). Exact MVP scope is TBD; legacy capabilities below are candidates, not automatically approved requirements.

Evidence: [legacy guidance](../../client/CLAUDE.md), [database schema](../../client/prisma/schema.prisma), and route handlers under `client/src/app/api/`. Some legacy guidance is stale: the package specifies Next.js 16, the schema contains six models, and the deployment files have moved.

## Requirements and acceptance criteria

| ID | Status | Requirement | Acceptance criteria |
|---|---|---|---|
| REQ-001 | Confirmed | Independent FastAPI backend in `server/` | Can start and serve HTTP without starting Next.js; health and generated OpenAPI are verified by API tests. |
| REQ-002 | Confirmed | Defer frontend work | Backend implementation does not require changing client pages or components. |
| REQ-003 | Confirmed factory constraint | Simple, testable architecture with minimal justified dependencies | Dependency purposes documented; business rules can be tested without real external services; no speculative framework layers. |
| REQ-004 | Proposed | Create, retrieve, and complete Commander games; list completed history | Persist game and players atomically; completion only accepts that game's players and a valid winner; invalid completion leaves data unchanged. |
| REQ-005 | Proposed | Player, commander, and color statistics | Only completed games count; fixture results verify wins, appearances, percentages, colorless combinations, and empty datasets. |
| REQ-006 | Proposed | User-owned decks and card lists, including bulk import | CRUD works for owner; other users cannot read or mutate resources; invalid bulk requests have no partial writes. |
| REQ-007 | Proposed | User-owned card inventory | CRUD preserves quantity, finish, condition, printing metadata; cross-user access is denied. |
| REQ-008 | Proposed | Scryfall autocomplete, lookup, and print search | Mocked successes, not-found, timeout, throttling, and upstream failure return documented responses; requests have finite timeouts. |
| REQ-009 | Proposed | Authenticate access to private resources | Verified identity determines ownership; missing/invalid credentials fail; clients cannot choose their owner ID. Provider and game visibility remain TBD. |

## Accepted initial release (supersedes the legacy proposals above)

| ID | Status | Requirement | Acceptance criteria |
|---|---|---|---|
| REQ-010 | Confirmed | User CRUD | Create/list/read/update/delete with bounded names, email validation, unique-email conflicts, and no client-controlled verification fields. |
| REQ-011 | Confirmed | Pod and membership CRUD | Registered or temporary members, unique registered membership, nested pod/member checks, and atomic membership changes preserving referenced history. |
| REQ-012 | Confirmed | Game CRUD | Pod association, optional played timestamp and players, exact same-pod participant checks, duplicate prevention, atomic updates, and documented deletion cascades. |
| REQ-013 | Confirmed | SQLAlchemy ORM / PostgreSQL / supplied SQL schema | ORM mapping and CRUD verified against the supplied migration on disposable PostgreSQL; explicit migration command with no production changes. |
| REQ-014 | Confirmed | Versioned API, authentication later | `/api/v1`, snake_case contracts and bounded lists; auth is not required for initial routes. |

REQ-004's legacy game-completion contract and REQ-005–REQ-009 (statistics, decks, inventory, Scryfall, auth) are deferred. Game results and pod-admin permission APIs are also deferred; their tables are mapped to preserve schema fidelity. Existing-data retention/cutover remains unresolved and is not required to implement this separate API.

## Business rules (proposed unless stated as legacy evidence)

- Legacy game creation permits 2–6 players and starting life 1–999, default 40. Retaining these limits is proposed.
- Normalize names and reject whitespace-only values. Color identities contain unique W/U/B/R/G symbols; an empty list represents colorless.
- Game completion must validate the exact participant set, reject duplicates and foreign player IDs, and apply all writes in one transaction. Winner identity, draws, repeated completion, duplicate player names, and concurrency policy are TBD. Legacy completion currently identifies winners by name and does not enforce these membership checks.
- Legacy deck names have a 100-character limit; bulk import accepts 1–500 entries with names up to 200 characters and `commander|mainboard` categories. Quantity merging and Commander legality enforcement are TBD.
- Legacy inventory permits quantities 1–9999 and conditions `NM|LP|MP|HP|DMG`. Price currency, precision, freshness, and whether prices are client supplied are TBD.

## Nonfunctional expectations (proposed)

Never expose credentials or internal exception details. Enforce ownership in persistence queries, bound external I/O and collection responses, avoid blocking the event loop, and preserve transaction integrity. Log request outcome and latency without tokens or request bodies. Measure performance on a stated dataset before optimizing; latency, throughput, dataset size, and availability targets are TBD. Accessibility belongs to the deferred frontend; errors must remain machine readable.

## Non-goals and open questions

Confirmed non-goal: frontend rebuild during this phase. Proposed non-goals: live multiplayer synchronization, persistent turn-by-turn event tracking, trading/payments, automatic price refresh, and full deck legality enforcement. The legacy event model alone does not establish an event API requirement.

Python 3.12, SQLAlchemy ORM, PostgreSQL, users/pods/games CRUD, `/api/v1`, and deferred authentication are confirmed. Auth provider, future permissions, game-result semantics, existing-data conversion, and hosting remain open for later tasks. Never reset a database based on the phrase “from scratch.”

See [architecture](ARCHITECTURE.md), [API](API.md), and [tasks](TASKS.md).
