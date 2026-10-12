# FastAPI Project Documentation Factory

> **Purpose:** This file is the single starting point for an AI coding agent to create and maintain the documentation for a FastAPI project. It is an instruction file, not application code.

## How to use

1. Fill out as much of **Project input** as you know. Leave unknown items as `TBD`.
2. Open the project root in your AI coding tool.
3. Give the agent this instruction:

   > Read `PROJECT_FACTORY.md`. Inspect the repository, then initialize the Markdown documentation specified in this file. Create documentation only; do not implement application code. Show me your assumptions and any unresolved decisions when finished.

4. Review the generated documentation before asking the agent to implement items in `docs/TASKS.md`.

## Project input

Edit these fields before running the factory. The agent should use existing repository evidence to fill gaps, rather than inventing requirements.

| Field | Value |
|---|---|
| Project name | TBD |
| One-sentence purpose | TBD |
| Target users | TBD |
| Main use cases / MVP features | TBD |
| Out-of-scope features | TBD |
| Python version | TBD |
| Storage / database | TBD |
| Authentication / authorization | TBD |
| External integrations | TBD |
| Deployment target | TBD |
| Nonfunctional needs (security, performance, reliability) | TBD |
| Constraints | Prefer the Python standard library and minimal dependencies; keep architecture simple and testable |

## Agent operating rules

1. **Inspect first.** Read existing documentation, `pyproject.toml` or dependency files, application structure, tests, and configuration before writing. For an empty repository, rely on the project input above.
2. **Documentation only.** Do not create or refactor Python code, install packages, or change infrastructure while running this factory.
3. **Never silently overwrite.** If a target file already exists, preserve its established decisions and update only missing or stale relevant sections. If changes would conflict with existing decisions, flag the conflict instead of choosing silently.
4. **Do not invent specifics.** Mark unknown choices `TBD` and put consequential open questions in the relevant document. Ask only when a missing decision prevents meaningful documentation.
5. **Prefer simple design.** Use a modular FastAPI architecture appropriate to project complexity; introduce routers, services, repositories, and abstractions only where they clarify responsibilities. Do not prescribe an ORM, DI framework, task queue, or cloud platform without justification.
6. **Separate facts from plans.** Label speculative endpoints, features, schemas, or infrastructure as `Proposed` until implemented or confirmed.
7. **Keep documents consistent.** Requirements, architecture, API contracts, testing approach, tasks, and decisions must agree. Cross-link related documents with relative paths.
8. **Make work verifiable.** Define clear acceptance criteria and tests for each implementation task. Favor small, independently reviewable steps.
9. **Protect secrets.** Never put credentials, tokens, private keys, or real customer data in Markdown files.
10. **Stay concise.** Use useful sections, tables, and short examples. Avoid filler and duplicating large sections across files.

## Output files

Create the following files at these exact paths, unless this repository already has an equivalent convention. Keep the documents specific to the project.

### `docs/REQUIREMENTS.md` — Source of truth for *what*

Include:
- Problem statement and users
- MVP features with IDs (`REQ-001`, etc.)
- Acceptance criteria for each feature
- Business rules and data validation expectations
- Nonfunctional requirements (security, observability, performance, accessibility as applicable)
- Explicit non-goals, assumptions, and open questions

Do not turn vague feature ideas into confirmed requirements.

### `docs/ARCHITECTURE.md` — Source of truth for *how*

Include:
- System overview and boundaries
- Proposed directory layout and responsibilities
- Request/data flow: route → business logic → persistence/external service, where applicable
- Data storage, configuration, lifecycle, and dependency management
- Sync/async choices and I/O boundaries
- Security, error handling, logging, and deployment considerations
- Trade-offs and links to `DECISIONS.md`

Only describe components as existing if they actually exist. Favor lightweight modules over premature layers.

### `docs/API.md` — HTTP contract

Include:
- Base path/versioning conventions (or `TBD`)
- Endpoints table: method, path, purpose, status (`Existing` or `Proposed`)
- Request/response schema summaries, status codes, validation, and error format
- Authentication/authorization requirements
- Pagination/filtering conventions when relevant
- Relationship to FastAPI's generated OpenAPI documentation

Do not claim endpoints are implemented unless found in code.

### `docs/CONVENTIONS.md` — Coding standards

Include:
- Python naming, type hints, imports, and module boundaries
- FastAPI router and dependency conventions
- Pydantic validation and serialization rules
- Async guidance: use `async def` for genuinely asynchronous I/O; avoid blocking the event loop
- Exceptions and HTTP error translation
- Configuration, environment variables, and secrets handling
- Dependency policy: prefer the standard library, add packages only when justified
- Formatting/linting tools only if chosen or already configured

### `docs/TESTING.md` — Verification strategy

Include:
- Test layers: unit tests, API/integration tests, and optional end-to-end tests
- Pytest conventions, fixtures, and test organization
- How to mock external services and isolate database state
- Happy paths, validation errors, authorization failures, and edge cases
- Commands to run tests (use `TBD` until a real command is known)
- Expected checks before a task is considered complete

### `docs/TASKS.md` — Execution plan

Include:
- A short prioritized roadmap based on confirmed MVP requirements
- Markdown checkboxes for small implementation tasks
- For each task: ID (`TASK-001`), related requirement IDs, dependencies, and acceptance criteria
- Separate sections for `Next`, `In progress`, `Done`, and `Blocked`
- Setup/test/documentation work as needed, without assuming it has already happened

When a task is completed later, update its status only after verifying its acceptance criteria.

### `docs/DECISIONS.md` — Architecture decision log

Include a short ADR-like entry for each *actual* substantive decision:
- ID, date, decision, context, alternatives, consequences, and status (`Proposed`, `Accepted`, `Superseded`)

If no decisions have been made, add a heading and a clearly labeled decision template instead of fabricating decisions.

### `README.md` — Human entry point

Include:
- Project summary and current development status
- Main capabilities and technology choices, labeled `Proposed` when appropriate
- Setup, run, and test instructions only when verified (otherwise `TBD`)
- A documentation index linking to `AGENTS.md` and `docs/*.md`

### `AGENTS.md` — Ongoing AI instructions

Generate a short instruction file directing future coding agents to:
- Read `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, and `docs/CONVENTIONS.md` before coding
- Select work from `docs/TASKS.md`, one small task at a time
- Respect existing code, avoid gratuitous dependencies and overengineering
- Add or update tests according to `docs/TESTING.md`
- Keep `docs/API.md` aligned with endpoint behavior
- Record material design changes in `docs/DECISIONS.md`
- Mark tasks done only after their acceptance criteria are satisfied
- Report what changed, what was verified, and what remains unresolved

Make `AGENTS.md` refer to generated files rather than copying their contents.

## Generation sequence

1. Inspect the repository and resolve what is already known.
2. Create/update `docs/REQUIREMENTS.md`.
3. Create/update `docs/ARCHITECTURE.md` and `docs/DECISIONS.md`.
4. Create/update `docs/API.md` and `docs/CONVENTIONS.md`.
5. Create/update `docs/TESTING.md`.
6. Create/update `docs/TASKS.md`, with traceable requirements and acceptance criteria.
7. Create/update `README.md` and `AGENTS.md` last, referencing the other files.
8. Validate cross-links, task/requirement IDs, consistency, and that no implementation work was performed.

## Completion report

At the end of the factory run, report:

- Files created and files updated
- Project assumptions used
- Decisions needing human confirmation
- The first recommended task from `docs/TASKS.md`

**Factory success condition:** All nine Markdown files exist, agree with one another, distinguish known facts from proposals, and provide enough direction for an AI agent to start implementing the first small FastAPI task after review.
