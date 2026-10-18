# Backend coding conventions

Apply these standards to backend implementation. Python 3.12 and uv are configured.

- Use `uv` for Python version/environment management, dependency installation, and command execution. Declare dependencies in `pyproject.toml`, commit `uv.lock`, and use `uv sync --locked` for reproducible installs. Run the server and tests through `uv run`; exact commands will be verified in TASK-001.
- Include `poetry` in the development dependency group when `pyproject.toml` is created, as requested by the user. Manage this dependency through uv.

- Use snake_case functions/modules/variables, PascalCase classes, UPPER_CASE constants, explicit imports, and type hints on public functions. Avoid wildcard imports and import-time I/O. Use Python 3.12; keep `.python-version` at `3.12` and declare `requires-python = ">=3.12,<3.13"` in `pyproject.toml`.
- Keep HTTP validation, status codes, and serialization in routers; extract meaningful domain orchestration without adding empty layers. Group routers by domain. Use FastAPI dependencies for verified identity and request-scoped resources, not a separate DI framework.
- Use Pydantic request and response models with explicit constraints. Distinguish omitted update fields from explicit null. Validate IDs, bounds, enums, duplicate participants, and canonical color identities. Proposed JSON naming and errors follow [API](API.md); confirm the contract before domain implementation.
- Use `async def` for genuinely async I/O. Never put a synchronous driver or HTTP request directly in an async route. Keep blocking work in sync routes or an explicit worker boundary; no background queue unless requirements justify it.
- Raise meaningful domain exceptions where needed; translate them to documented HTTP responses. Preserve rollback on failures. Avoid catch-all handlers that turn upstream failures into empty successful results or leak exception text.
- Read validated configuration from environment through one module. Fail clearly on missing required configuration. No embedded credentials, logged tokens, committed real env files, or implicit production defaults. Add example environment variables only when the implementation uses them.
- Prefer the standard library. Use SQLAlchemy ORM with Psycopg for PostgreSQL persistence. Exact runtime/test versions are pinned in `uv.lock`; PyJWT with cryptography verifies Clerk session tokens. Record why each added package is needed. No formatter/linter is selected.
- Use timezone-aware timestamps and ORM queries with bound parameters. Enforce nested resource membership. Clerk subject verification establishes identity; user records and pod admins alone are not caller credentials. Enforce self-only profile access, pod membership/admin/owner permissions, and completed-only public history in persistence queries. Never infer account links or ownership from submitted email or IDs.
- Follow [testing](TESTING.md), keep [API](API.md) synchronized, and record material choices in [decisions](DECISIONS.md). No frontend changes during the backend phase.
