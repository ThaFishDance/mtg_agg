# Backend architecture

> Frontend direction updated 2026-10-20: the user authorized removing the legacy
> pages/routes and restarting UI development with a mobile-first approach. See
> [frontend tasks](../../client/TASKS.md). References below to deferred frontend
> work or the legacy client describe the earlier backend phase. Backend APIs,
> stored data, and migrations are unchanged by the frontend reset.


## Boundaries and current state

Accepted direction: a separate FastAPI service under `server/`; frontend work is deferred. `app/main.py` provides `create_app()` and an independent `/api/health` route with a typed response. Python 3.12 and uv are configured; API tests run in process. The legacy system combines Next.js routes, Prisma, PostgreSQL, Clerk, and Scryfall in `client/`. Do not reuse Prisma as a Python persistence layer or remove the legacy system during initial implementation.

The domain scope is users, pods, and games under `/api/v1`, with Clerk authentication and pod permissions implemented in `app/auth.py`. `app/models.py` maps all seven tables in the user-supplied migration using SQLAlchemy ORM. `app/schemas.py` defines typed contracts, `app/api.py` implements CRUD, and `app/db.py` provides pooled engines and a transaction per request. Synchronous routes run blocking ORM operations outside the event loop. The dependency uses function scope so commit/rollback completes before a successful response is sent. Engines are disposed during application shutdown. See SQLAlchemy's [session transaction guidance](https://docs.sqlalchemy.org/en/20/orm/session_basics.html).

Game results use the existing `game_result` table with POST/GET `/api/v1/games/{game_id}/result`. Both result creation and participant replacement lock the game row for the transaction, serializing competing writes. Null winners represent draws; existing results prevent any participant replacement. Identical submissions return the existing result; conflicting submissions return 409. No schema changes were needed. Game responses expose a nullable scalar result relationship. Game lists eager-load players and results, and filter completion using result existence before pagination; draws count as completed regardless of winner nullability.

## Proposed layout

```text
server/
  pyproject.toml
  app/
    main.py          # app factory, router registration, lifecycle
    config.py        # validated environment configuration
    api/             # domain routers and HTTP dependencies
    schemas/         # Pydantic request/response models
    services/        # domain rules when orchestration merits a module
    db/              # persistence queries, connection lifecycle
    integrations/    # Scryfall boundary; auth adapter if required
  tests/
    unit/
    api/
    integration/
  docs/
  deployment/        # future deployment assets; currently empty
```

Create modules when a task needs them; do not scaffold empty domain layers. SQLAlchemy ORM is selected. No queue, repository base class, DI framework, or cache service is selected.

## Request and data flow

HTTP → router/Pydantic validation → identity dependency for protected routes → domain function where needed → database query or external adapter → explicit response schema. Translate expected domain errors at the HTTP boundary. For simple reads, a route may call a focused persistence function directly.

Game creation/completion and bulk import use database transactions. Owner constraints belong in queries, including nested deck-card operations. Player statistics aggregate completed appearances, wins, and draws in PostgreSQL, scoped to the game pod and grouped by pod-member ID. An outer join to pod members includes zero-appearance members; pagination and member-ID ordering apply to the aggregated rows. Win-rate calculation operates only on the returned page. No history is loaded into application memory. Commander statistics similarly aggregate completed player appearances in SQL, grouping exact main/secondary card values and excluding null/blank main cards. Card-pair ordering and pagination apply after grouping, with win rates calculated only for the returned page.

Color statistics normalize identities in PostgreSQL using an uppercase/trim expression and a W/U/B/R/G-only validity check (or explicit C), then group completed appearances by canonical identity. This bounds the fetched aggregate to 32 rows. Python rolls these aggregates into individual colors and calculates rates; no game history is loaded into memory. Stored values and write contracts are unchanged.

## Storage and lifecycle

PostgreSQL is selected by the supplied migration, with SQLAlchemy ORM and Psycopg. The new schema contains `app_user`, `pod`, `pod_member`, `pod_user_admin`, `game`, `pod_game_player`, and `game_result`. The SQL file remains the schema source; `app.migrate` applies versioned SQL explicitly with a transactional checksum ledger. There is no startup schema creation, legacy data conversion, or automatic baseline adoption. Existing-data mapping and production cutover remain deferred.

Use request-scoped transaction/connection handling; initialize and release shared clients or pools during application lifecycle. Avoid network or database work at import time. Keep UTC-aware timestamps. Configure through environment variables; document only variables actually implemented. Proposed settings: environment, database connection, allowed frontend origins, upstream timeout, and auth verification configuration. Do not copy Next.js secret handling into the new service.

## I/O, security, and operations

Use async routes with genuinely async clients; use sync routes for blocking clients or explicitly offload blocking work. Driver/client selection determines this boundary. Share bounded HTTP connections and honor upstream throttling; no automatic unbounded retries. Clerk session verification is implemented with PyJWT/cryptography against a configured RS256 public key, issuer and authorized parties. Caller identity maps by unique Clerk subject. Pod permissions and private defaults are enforced, with owner-only public visibility and admin grants (see [auth documentation](AUTH.md)); never accept an unsigned token or client-provided identity as authentication.

Proposed errors and pagination are in [API](API.md). Use standard logging initially, with request IDs and durations if implemented; avoid secrets and detailed public failures. Keep liveness independent of external services; readiness checks, monitoring backend, shutdown policy, CORS origins, workers, TLS/proxy trust, and deployment target remain TBD. Legacy deployment files are reference only and have relative-path issues after relocation; they are not a verified backend deployment recipe.

## Trade-offs

Modular monolith keeps development and tests simple. Separate backend means auth, CORS, and API contracts must be explicit. A clean implementation does not imply a clean production database. See [decisions](DECISIONS.md), [requirements](REQUIREMENTS.md), and [testing](TESTING.md).

Explicit local development mode (`python -m app local`) uses SQLite at server/local.db, ignoring DATABASE_URL. Only this mode initializes ORM tables on startup. Connections enforce foreign keys and begin transactions with BEGIN IMMEDIATE to serialize competing updates. Normal startup and SQL migrations retain PostgreSQL behavior. SQLite files persist but existing schemas require explicit maintenance after model changes.
