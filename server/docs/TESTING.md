# Backend verification strategy

## Current status

The suite covers health/OpenAPI, users/pods/games CRUD, nested member boundaries, input and pagination bounds, PostgreSQL constraint conflicts, deletion cascades, cross-pod participant rejection, transaction rollback, ORM/migration column agreement, and repeatable SQL migration execution. Integration tests apply the actual supplied SQL in isolated schemas and run the production SQLAlchemy transaction dependency. No authentication, client process, or external API is required. PostgreSQL tests skip unless `TEST_DATABASE_URL` is set.

Game-result verification on **2026-10-16**: **18 tests passed without warnings** against PostgreSQL. Coverage includes winner/draw persistence, identical/conflicting repeats, invalid and foreign winners, rollback of combined timestamp/player changes, participant locking after draws and wins, deletion cascades, concurrent identical/conflicting submissions, completion racing participant replacement, and generated OpenAPI result schemas/statuses.

## Proposed test layers

- Unit: pytest `test_*.py`, focused business rules for completion, colors, inventory bounds, and statistics. No real network or database.
- API: in-process FastAPI application fixture; test health, OpenAPI, request validation, status/error schemas, and dependency overrides. A pytest-compatible HTTP test client is proposed; dependencies selected in TASK-001.
- Integration: selected real database engine in disposable state; verify transactions, constraints, ownership queries, migrations, and concurrent/repeated completion behavior. Do not substitute SQLite for PostgreSQL-specific semantics if PostgreSQL is selected.
- Optional end-to-end: deployed HTTP smoke checks after deployment is defined. Browser tests are deferred with frontend work.

## Fixtures and isolation

Create an application per test or reset overrides after use. Inject a fixed clock for duration tests. Mock the Scryfall transport and auth boundary, not business rules; cover success, malformed payloads, not-found, timeout, 429, and 5xx. Authentication adapter tests must also exercise real signature/claims verification using local test keys if token auth is chosen.

Use separate users, deterministic games, and independently isolated database state. Never use production credentials or customer data. Prefer transaction rollback fixtures where supported; use disposable databases for migration and concurrency tests. Ensure lifecycle cleanup closes clients/pools.

## Required scenarios

Happy paths; missing/invalid fields; nonpositive/foreign IDs; whitespace names; duplicate/missing/foreign participants; valid winner rules once resolved; atomic rollback; non-owner read/write attempts; nested cards belonging to another deck; bulk size boundaries; empty and colorless statistics; external service failure; sanitized internal errors. Authentication includes missing, expired, incorrectly signed, and wrong-issuer/audience tokens where applicable.

## Commands and completion checks

Verified on 2026-10-12 with Python 3.12.14 and uv 0.12.15, from `server/`:

```sh
uv sync --locked
uv run --locked pytest
uv run --locked uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000
```

TASK-001 verification: locked installation passed; **2 tests passed**; live health/OpenAPI returned 200 and Uvicorn shut down cleanly.

Initial CRUD verification repeated on **2026-10-16**: **11 tests passed without warnings** against isolated PostgreSQL 16 schemas using Python 3.12.14. Refreshed stale dependency metadata in `uv.lock`; `uv sync --locked` passed. Starlette's test client was confirmed to use HTTPX2, and generated OpenAPI CRUD paths and methods match the documented contract. Run `uv run --locked pytest` with `TEST_DATABASE_URL` set as shown in [README](../README.md). Without it, database tests skip; this is not a full integration pass. Formatting/lint tooling remains unselected.

Before a task is done: satisfy its acceptance criteria, run the relevant tests, review generated OpenAPI against [API](API.md), update affected documentation, and report unresolved limits. Broaden testing only when the change warrants it. See [tasks](TASKS.md).
