# MTG Aggregator backend requirements

> Frontend direction updated 2026-10-20: the user authorized removing the legacy
> pages/routes and restarting UI development with a mobile-first approach. See
> [frontend tasks](../../client/TASKS.md). References below to deferred frontend
> work or the legacy client describe the earlier backend phase. Backend APIs,
> stored data, and migrations are unchanged by the frontend reset.


## Status and evidence

The user confirmed a FastAPI backend with users, pods, and games CRUD, based on `migrations/v001__create_initial_tables.sql`, using SQLAlchemy ORM and PostgreSQL. Clerk session verification and pod permissions are implemented. Pod history/statistics must be private by default and may be made public only with pod-owner approval. `/api/v1` and snake_case JSON are accepted; client updates happen later. Python 3.12 and uv are configured. CRUD and integration tests are implemented; deployment and legacy-data cutover remain deferred. The existing Next.js application is a reference, not the new backend.

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
| REQ-009 | Confirmed, implemented | Authenticate access to private resources with Clerk | Verify Clerk identity on the backend and map it to a local user; clients cannot choose their authenticated identity. Pod history/statistics are private by default; only the pod owner may approve public visibility. Members read; admins manage members/games/results; owners also control visibility/admin grants and pod deletion. |

## Accepted initial release (supersedes the legacy proposals above)

| ID | Status | Requirement | Acceptance criteria |
|---|---|---|---|
| REQ-010 | Confirmed | User CRUD | Create/list/read/update/delete with bounded names, email validation, unique-email conflicts, and no client-controlled verification fields. |
| REQ-011 | Confirmed | Pod and membership CRUD | Registered or temporary members, unique registered membership, nested pod/member checks, and atomic membership changes preserving referenced history. |
| REQ-012 | Confirmed | Game CRUD | Pod association, optional played timestamp and players, exact same-pod participant checks, duplicate prevention, atomic updates, and documented deletion cascades. |
| REQ-013 | Confirmed | SQLAlchemy ORM / PostgreSQL / supplied SQL schema | ORM mapping and CRUD verified against the supplied migration on disposable PostgreSQL; explicit migration command with no production changes. |
| REQ-014 | Confirmed, auth policy superseded by REQ-009 | Versioned API | `/api/v1`, snake_case contracts and bounded lists. Initial unauthenticated behavior is now replaced by Clerk and pod permissions under REQ-009. |
| REQ-015 | Confirmed 2026-10-16 | Record/read one result per game | Winner is a game-player ID or explicit null for a draw; identical repeats return the existing result, conflicting repeats return 409; participants cannot be replaced after a result exists. Concurrent writes and rollback verified against PostgreSQL. |

Completed-game filtering and embedded results are accepted under REQ-016. REQ-004's legacy game-completion contract and REQ-006–REQ-008 (decks, inventory, Scryfall) are deferred. REQ-009 is implemented for Clerk, self-profile access, owner/admin/member roles, and pod privacy. Per-pod color statistics are accepted under REQ-019; other legacy statistics contracts remain reference only. Per-pod player and commander statistics are accepted under REQ-017 and REQ-018. Owner-only pod admin grants/revocations are implemented using the mapped admin table. Existing-data retention/cutover remains unresolved and is not required to implement this separate API.

| ID | Status | Requirement | Acceptance criteria |
|---|---|---|---|
| REQ-016 | Confirmed 2026-10-16 | Completed-game history | Optional completed filter combines with pod filtering and bounded pagination, preserving ID ordering. Results embedded in game responses; wins and draws count as completed, absent results as unfinished. |
| REQ-017 | Confirmed 2026-10-16 | Player statistics per pod | Count completed appearances, wins, and draws by pod-member ID. Win rate is wins divided by completed appearances, including draws, as a percentage rounded to two decimals. Include zero-appearance members; bounded pagination and ID ordering. |
| REQ-018 | Confirmed 2026-10-16 | Commander statistics per pod | Group completed player appearances by stored main/secondary card pair; exclude absent/blank main cards. Count appearances, wins, and draws; percentage win rate includes draws in the denominator. Bounded pagination and deterministic pair ordering. |
| REQ-019 | Confirmed 2026-10-16 | Color statistics per pod | Count completed player appearances, wins, draws, and percentage win rates for individual colors and exact combinations. Normalize case/order/duplicates of W/U/B/R/G; C is explicit colorless. Exclude null, blank, and invalid values. Draws remain in the denominator. |

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

Python 3.12, SQLAlchemy ORM, PostgreSQL, users/pods/games CRUD, `/api/v1`, and Clerk authentication are confirmed. Clerk and private-by-default pod history/statistics with owner-approved public visibility are confirmed. Creator ownership and member/admin write permissions are implemented. Ownership transfer and existing identity/ownership backfill, broader game-lifecycle semantics, existing-data conversion, and hosting remain open. See [auth plan](AUTH.md). Never reset a database based on the phrase “from scratch.”

See [architecture](ARCHITECTURE.md), [API](API.md), and [tasks](TASKS.md).

| REQ-020 | Confirmed 2026-10-17 | Explicit local SQLite mode | `python -m app local` uses persistent SQLite, ignores DATABASE_URL, initializes local tables, and supports existing CRUD/results/statistics. Startup without local retains PostgreSQL configuration. |
