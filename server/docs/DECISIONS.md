# Architecture decisions

## ADR-001 — Separate FastAPI backend

- Date: 2026-10-12
- Status: Accepted
- Decision: Build the new backend in `server/` with FastAPI; defer frontend work.
- Context: User requested a backend rebuild on this branch; the old application now resides in `client/`.
- Alternatives: Continue Next.js route handlers; rebuild both frontend and backend together.
- Consequences: Python service and independent HTTP contract are needed. Legacy behavior informs proposed scope but does not mandate API compatibility or data deletion.

## ADR-002 — Documentation before implementation

- Date: 2026-10-12
- Status: Accepted
- Decision: This factory pass generates backend documentation only, following [project_factory.md](../project_factory.md).
- Context: The user directed the agent to the factory, which requires documentation review before implementation.
- Alternatives: Implement an assumed backend immediately.
- Consequences: No Python code, package installation, or infrastructure changes in this pass. Open product and technology choices remain explicit.

## ADR-003 — Retain PostgreSQL

- Date: 2026-10-12
- Status: Proposed
- Decision: Consider PostgreSQL as the rebuild's persistent store.
- Context: Existing Prisma schema and Compose files use PostgreSQL, including color arrays.
- Alternatives: SQLite for a small deployment; another store if requirements justify it.
- Consequences: Could ease data continuity; requires selecting a Python driver and migration strategy. No database or ORM has been approved.

## ADR-004 — Use uv for Python tooling

- Date: 2026-10-12
- Status: Accepted
- Decision: Use `uv` to manage Python versions, environments, dependencies, and server/test command execution.
- Context: User requested that the server use uv.
- Consequences: TASK-001 must provide `pyproject.toml`, commit `uv.lock`, and verify locked installation and `uv run` commands. No Python backend or tooling configuration exists yet.

## ADR-005 — Python 3.12

- Date: 2026-10-12
- Status: Accepted
- Decision: Use Python 3.12 for the backend.
- Context: User selected Python version 12, interpreted as Python 3.12.
- Consequences: `.python-version` selects `3.12`; TASK-001 must declare `requires-python = ">=3.12,<3.13"` and verify commands with Python 3.12.

## ADR-006 — Minimal FastAPI foundation dependencies

- Date: 2026-10-12
- Status: Accepted
- Decision: Use FastAPI and Uvicorn at runtime; pytest and HTTPX2 for in-process API tests (HTTPX2 replaced HTTPX at the user's request); include Poetry as a user-requested development dependency. uv manages all dependencies with `uv.lock`.
- Context: TASK-001 requires independently runnable HTTP, typed health responses, generated OpenAPI, and API verification with no external services.
- Consequences: Pydantic is provided transitively by FastAPI. No database, auth, migration, or domain dependencies are introduced. `/api/health` preserves the legacy liveness path without deciding domain API versioning. Lockfile pins resolved versions; runtime-only installs can use `uv sync --locked --no-dev` (not verified in TASK-001).

## ADR-007 — Initial users, pods, and games API

- Date: 2026-10-12
- Status: Accepted
- Decision: Implement users, pods/members, and games/players CRUD under `/api/v1` with snake_case JSON. Use the supplied `v001__create_initial_tables.sql` as the PostgreSQL schema and SQLAlchemy ORM with Psycopg. Defer authentication and client migration.
- Context: User explicitly chose this scope and subsequently requested SQLAlchemy ORM.
- Consequences: Endpoints are unauthenticated; pod admins do not authorize requests. Statistics, decks, inventory, Scryfall, game-result APIs, and authentication are deferred. Nested membership is enforced. List defaults are 50 with maximum 100 and ID ordering. SQL migration execution is explicit, transactional, and checksum-tracked. No legacy-data or production migration is performed; cutover remains open. Pod updates replace unreferenced members; nested member updates preserve member IDs. User deletion retains a temporary identity so the supplied identity check survives `ON DELETE SET NULL`.

## ADR-008 — Game-result contract

- Date: 2026-10-16
- Status: Accepted by user
- Decision: POST/GET `/api/v1/games/{game_id}/result` records/reads one result using the supplied schema. `player_winner` is required and nullable: a game-player ID indicates a winner; null indicates a draw. First creation returns 201, identical retries return the original result with 200, and conflicting retries return 409. Winner must belong to the game.
- Consequences: Game-row locks serialize result submissions with participant replacement. Any result, including a draw, blocks player replacement. Timestamp-only updates and existing game/pod deletion remain supported. Authentication, result editing/deletion, history filters, and wider lifecycle rules remain deferred. No migration or client changes. Verified by PostgreSQL and OpenAPI tests.

## ADR-009 — Completed-game history

- Date: 2026-10-16
- Status: Accepted; user requested continuation of the proposed history scope
- Decision: Add optional `completed` to GET `/api/v1/games` and include nullable `result` in game responses. Completion means a result exists, including draws. Omission retains the full list. Existing pod filter, bounded pagination, and ascending game-ID ordering remain.
- Consequences: Filtering uses result existence and combines before pagination. List responses eager-load results and players. Create/update responses share the same game schema and also include `result`. No database migration; timestamp semantics unchanged. Verified with PostgreSQL API tests and OpenAPI assertions.

## Future decision template

ID, date, status (Proposed/Accepted/Superseded), decision, context, alternatives, consequences, and links to affected documents. Record auth, runtime, contract, migration, and deployment choices when resolved. See [architecture](ARCHITECTURE.md).
