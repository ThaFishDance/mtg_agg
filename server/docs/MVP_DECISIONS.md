# TASK-002 decision worksheet

Status: initial CRUD scope accepted and implemented. User selected users, pods, and games based on the supplied PostgreSQL migration; SQLAlchemy ORM; `/api/v1`; client migration and authentication later. These explicit choices authorize the initial CRUD implementation. Legacy feature choices below remain reference for deferred work.

## Confirmed foundation

- FastAPI backend, frontend work deferred.
- Python 3.12, uv environment/dependency/command management, Poetry development dependency.
- Independent health endpoint and generated OpenAPI verified in TASK-001.

## Release and technology choices

| Decision | Legacy evidence | Choice needed |
|---|---|---|
| MVP scope | Games, statistics, decks, inventory, and Scryfall routes exist | Games/statistics first, or all legacy features |
| Database | Prisma schema uses PostgreSQL, arrays, and timezone-aware timestamps; deployment references PostgreSQL 16 | Retain PostgreSQL or select another store |
| Authentication | Client uses Clerk; decks and inventory resolve authenticated owners | Clerk approved and implemented; see AUTH.md |
| Data retention | Six legacy tables include games, participants, events, decks, deck cards, and inventory | Preserve existing data or use a separate fresh database |
| API compatibility | Existing `/api` routes mix camelCase requests and snake_case responses | Preserve formats or introduce `/api/v1` with consistent snake_case |

## Domain decisions remaining after initial choices

Game-result scope was approved on 2026-10-16: winner by game-player ID, explicit null for draws, identical retries return the existing result, conflicting retries return 409, and all player replacement is blocked once a result exists. This supersedes winner/draw and repeat-result alternatives below for the implemented result API; completed-game filtering and embedded results were subsequently accepted in ADR-009; broader lifecycle features remain deferred. See ADR-008 in [decisions](DECISIONS.md).

| Decision | Concrete alternatives / constraints |
|---|---|
| Game visibility | Private by default; owner may enable public completed history/statistics. Creator owns pod; member reads, admin writes, owner manages visibility/admin grants. Implemented; see AUTH.md. |
| Winner and draws | Winner by participant ID or legacy name; support draws explicitly or require one winner |
| Duplicate names | Permit distinct participants with the same name using IDs, or reject duplicate normalized names |
| Completion | Validate exact participant set and write atomically; decide whether repeat completion returns the original result or 409 |
| Statistics | Define player/commander identity, draw denominator, color appearances, and ownership scope before implementation |
| Pagination | Preserve legacy arrays or use bounded collection envelopes; define defaults, maximums, and ordering |
| Persistence tooling | Select driver, SQL versus ORM, and migration tooling after database and data policy are settled |
| Migration/cutover | Preserving data requires a mapping and rehearsal, including game ownership and legacy winner names; no live migration is authorized |

Deck quantity merging, card access, printing resolution, and price handling require decisions if those features enter the MVP. Hosting can remain deferred to TASK-010.

## Completion criteria

Record user-selected choices in requirements, API, architecture, and accepted ADRs. Activate only the corresponding roadmap tasks and split them into reviewable steps. Keep TASK-002 open until its consequential choices are resolved.
