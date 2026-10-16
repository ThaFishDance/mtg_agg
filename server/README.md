# MTG Aggregator — FastAPI backend rebuild

This branch is preparing a fresh FastAPI backend for the existing MTG Commander tracker, deck builder, and inventory application. Frontend work is deferred. The legacy Next.js implementation is in `../client/` and serves as behavior reference.

Current status: `/api/v1` CRUD for users, pods (including members), and games (including players), using SQLAlchemy ORM and PostgreSQL. Authentication is deferred; routes currently permit unauthenticated access. Decks, inventory, Scryfall, and admin permissions are deferred. Per-pod player and commander-pair statistics are implemented; color statistics remain deferred. Game-result recording/retrieval and completed-game filtering are implemented. Game responses include a nullable result. Frontend work remains deferred.

From `server/`, use:

```sh
uv sync --locked
export DATABASE_URL='postgresql+psycopg://postgres:change-me@localhost:5432/mtg_agg'
uv run --locked python -m app.migrate
uv run --locked uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000
uv run --locked pytest
```

Health: `http://127.0.0.1:8000/api/v1/health` (also `/api/health`). OpenAPI: `/openapi.json`. Interactive docs: `/docs`. PostgreSQL is required for CRUD; health and OpenAPI remain independent. Environment variables are read from the process; `.env` files are not loaded automatically. See `.env.example` for configuration.

Use a dedicated database matching `migrations/v001__create_initial_tables.sql`. The explicit migration command records checksums, skips previously applied migrations, and rejects changes to applied scripts. It does not reset or adopt an existing legacy schema. No production database or legacy data was changed. The app never calls `create_all()` or runs migrations on startup.

Python tooling: **uv is required** for environment and dependency management and for running the server/tests. Dependencies are declared in `pyproject.toml` and resolved in `uv.lock`.

Python version: **3.12**, selected in `.python-version` and constrained by `requires-python = ">=3.12,<3.13"` in `pyproject.toml`.

Dependencies: FastAPI provides HTTP routing and response validation, with Pydantic included transitively; Uvicorn serves ASGI. SQLAlchemy supplies ORM mappings, pooled connections, and request-scoped transactions; Psycopg is its PostgreSQL driver. Development dependencies: pytest runs tests, HTTPX2 supports FastAPI's in-process test client, and Poetry is included at the user's request. uv manages installation and command execution. HTTPX remains a transitive Poetry dependency.

PostgreSQL integration tests use a separate schema per test and apply the supplied SQL migration. To reproduce:

```sh
docker run --detach --name mtg-api-crud-test --publish 127.0.0.1:55432:5432 --env POSTGRES_PASSWORD=local-test-only --env POSTGRES_DB=mtg_api_test postgres:16-alpine
export TEST_DATABASE_URL='postgresql://postgres:local-test-only@127.0.0.1:55432/mtg_api_test'
uv run --locked pytest
docker stop mtg-api-crud-test
```

Without `TEST_DATABASE_URL`, PostgreSQL tests are skipped. Verified on 2026-10-16: 26 tests passed without warnings against PostgreSQL 16, including migration execution, rollback, deletion cascades, and nested membership checks. The test client uses HTTPX2; locked dependency installation and documented OpenAPI CRUD paths/methods were also verified.

## Documentation

- [AGENTS.md](AGENTS.md) — ongoing agent instructions
- [Requirements](docs/REQUIREMENTS.md) — confirmed needs, proposed scope, open questions
- [Architecture](docs/ARCHITECTURE.md) — service boundaries and proposed organization
- [Endpoint diagrams](docs/diagrams/README.md) — PlantUML endpoint map and request sequences
- [API](docs/API.md) — legacy evidence and proposed HTTP contract
- [Conventions](docs/CONVENTIONS.md) — implementation standards
- [Testing](docs/TESTING.md) — verification strategy
- [Tasks](docs/TASKS.md) — prioritized implementation plan
- [Decisions](docs/DECISIONS.md) — accepted and proposed choices
- [Factory](project_factory.md) — documentation-generation instructions
