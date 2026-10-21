# MTG Aggregator — FastAPI backend rebuild

This branch is preparing a fresh FastAPI backend for the existing MTG Commander tracker, deck builder, and inventory application. Frontend work is deferred. The legacy Next.js implementation is in `../client/` and serves as behavior reference.

Current status: `/api/v1` CRUD for users, pods (including members), and games (including players), using SQLAlchemy ORM and PostgreSQL. Clerk session verification and owner/admin/member permissions are implemented. Pod history/statistics are private by default; only the owner may enable public reads of completed history/statistics. See the [auth plan](docs/AUTH.md). Decks, inventory, and Scryfall are deferred. Per-pod player, commander-pair, individual-color, and color-combination statistics are implemented. Game-result recording/retrieval and completed-game filtering are implemented. Game responses include a nullable result. Frontend work remains deferred.

From `server/`, use:

```sh
uv sync --locked
export DATABASE_URL='postgresql+psycopg://postgres:change-me@localhost:5432/mtg_agg'
# Configure CLERK_JWT_KEY, CLERK_ISSUER and CLERK_AUTHORIZED_PARTIES
# as described in docs/AUTH.md before authenticated requests.
uv run --locked python -m app.migrate
uv run --locked uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000
uv run --locked pytest
```

For local SQLite development, from `server/`:

```sh
uv run --locked python -m app local
```

This explicit argument ignores `DATABASE_URL`, creates `server/local.db` and missing tables, and preserves data across restarts. The file is gitignored. Optional `--host` and `--port` arguments configure the listener. `uv run --locked python -m app` uses the normal PostgreSQL configuration, as does the existing Uvicorn command. SQLite uses foreign-key enforcement and serialized write transactions; it is intended for local development. Local tables come from ORM metadata; the PostgreSQL SQL migration command remains PostgreSQL-only. Existing local schemas are not automatically upgraded when models change.

For a local database created before Clerk support, stop the local server and run:

```sh
uv run --locked python -m app.migrate_local
```

This SQLite-only command takes a timestamped `local.db-backup-*` backup, adds
missing Clerk/owner/visibility columns and constraints, and can be repeated.
Existing users stay unlinked and pods stay private; it does not infer ownership
or link accounts by email. PostgreSQL continues to use `app.migrate`.

Health: `http://127.0.0.1:8000/api/v1/health` (also `/api/health`). OpenAPI: `/openapi.json`. Interactive docs: `/docs`. PostgreSQL is required for CRUD outside explicit local mode; health and OpenAPI remain independent. Environment variables are read from the process; `.env` files are not loaded automatically. See `.env.example` for configuration.

Use a dedicated database with all checked-in migrations applied, including `v002__add_clerk_and_pod_access.sql`. Existing users/pods remain unclaimed and private until explicitly linked; no identity or owner is inferred. The explicit migration command records checksums, skips previously applied migrations, and rejects changes to applied scripts. It does not reset or adopt an existing legacy schema. No production database or legacy data was changed. The app never calls `create_all()` or runs migrations on startup.

Python tooling: **uv is required** for environment and dependency management and for running the server/tests. Dependencies are declared in `pyproject.toml` and resolved in `uv.lock`.

Python version: **3.12**, selected in `.python-version` and constrained by `requires-python = ">=3.12,<3.13"` in `pyproject.toml`.

Dependencies: FastAPI provides HTTP routing and response validation, with Pydantic included transitively; Uvicorn serves ASGI. SQLAlchemy supplies ORM mappings, pooled connections, and request-scoped transactions; Psycopg is its PostgreSQL driver. PyJWT with cryptography verifies Clerk RS256 session signatures using a configured public key; no Clerk API call is needed. Development dependencies: pytest runs tests, HTTPX2 supports FastAPI's in-process test client, and Poetry is included at the user's request. uv manages installation and command execution. HTTPX remains a transitive Poetry dependency.

PostgreSQL integration tests use a separate schema per test and apply the supplied SQL migration. To reproduce:

```sh
docker run --detach --name mtg-api-crud-test --publish 127.0.0.1:55432:5432 --env POSTGRES_PASSWORD=local-test-only --env POSTGRES_DB=mtg_api_test postgres:16-alpine
export TEST_DATABASE_URL='postgresql://postgres:local-test-only@127.0.0.1:55432/mtg_api_test'
uv run --locked pytest
docker stop mtg-api-crud-test
```

Without `TEST_DATABASE_URL`, PostgreSQL tests are skipped. Verified on 2026-10-18: 56 tests passed without warnings against PostgreSQL 16, including migration execution, rollback, deletion cascades, and nested membership checks. The test client uses HTTPX2; locked dependency installation and documented OpenAPI CRUD paths/methods were also verified.

## Documentation

- [AGENTS.md](AGENTS.md) — ongoing agent instructions
- [Requirements](docs/REQUIREMENTS.md) — confirmed needs, proposed scope, open questions
- [Architecture](docs/ARCHITECTURE.md) — service boundaries and proposed organization
- [Endpoint diagrams](docs/diagrams/README.md) — PlantUML endpoint map and request sequences
- [API](docs/API.md) — legacy evidence and proposed HTTP contract
- [Conventions](docs/CONVENTIONS.md) — implementation standards
- [Testing](docs/TESTING.md) — verification strategy
- [Tasks](docs/TASKS.md) — prioritized implementation plan
- [Auth plan](docs/AUTH.md) — session configuration, roles, visibility, and existing-record policy
- [Decisions](docs/DECISIONS.md) — accepted and proposed choices
- [Factory](project_factory.md) — documentation-generation instructions
