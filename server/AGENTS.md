# Backend agent instructions

Before coding, read [requirements](docs/REQUIREMENTS.md), [architecture](docs/ARCHITECTURE.md), and [conventions](docs/CONVENTIONS.md). Select one small task from [tasks](docs/TASKS.md); proposed features require scope confirmation before implementation.

Respect existing code and the user's working-tree changes. Keep the backend simple, justify dependencies, and defer frontend work. Do not interpret a rebuild as permission to delete production data or rewrite the client.

Add/update tests per [testing](docs/TESTING.md). Keep [API](docs/API.md) aligned with verified endpoint behavior and record material design changes in [decisions](docs/DECISIONS.md). Mark tasks done only after acceptance criteria are verified.

Report changes, checks actually run, and unresolved decisions. [project_factory.md](project_factory.md) applies to documentation factory runs; subsequent authorized implementation follows the task plan.

## Response Style
- Use the fewest words possible.
- Be direct and concise.
- Avoid explanations unless requested.
- No summaries, introductions, or filler.
- Prefer code over prose.
- Limit responses to 1–3 sentences when possible.
