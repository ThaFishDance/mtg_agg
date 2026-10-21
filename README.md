# MTG Aggregator

Run the frontend and backend together from the repository root:

```sh
make dev
```

Requires GNU Make, Bash 4.3+, Node.js/npm, Python 3.12, and uv. First install
frontend dependencies with `cd client && npm ci` and configure Clerk keys as
described in the [frontend README](client/README.md). uv installs the locked
backend dependencies automatically on its first run.

The frontend runs at http://localhost:3000 and backend API docs are at
http://localhost:8000/docs. The backend uses persistent SQLite storage at
`server/local.db`. Configure backend authentication through environment variables
as described in the [backend README](server/README.md).

Press Ctrl+C to stop both servers. If either server exits, the other is stopped
as well. Run `make frontend` or `make backend` to start just one service.
