# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Start Development

**Full stack via Docker Compose (recommended):**
```bash
docker compose up -d   # starts PostgreSQL + FastAPI (port 3001) + nginx frontend (port 80)
```

**Backend only (port 3001):**
```bash
cd server
python -m venv .venv # If you dont already have an existing venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --port 3001 --reload
```

**Frontend (port 5173):**
```bash
cd client && npm install && npm run dev   # Vite dev server
```

**Production build (droplet):**
```bash
git pull
cp deploy.prod.env.example .env
# edit .env with real secrets + hosts before starting
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

The `client/Dockerfile` is a multi-stage build: Node builds the React app, then nginx serves `dist/` and proxies `/api/` to the `api` container. In local Docker Compose, the API is also published on port 3001 so you can inspect it directly.

**API docs (auto-generated):**
```
http://localhost:3001/docs
```

**Local URLs:**
```
Frontend: http://localhost/
API docs: http://localhost:3001/docs
Health check: http://localhost:3001/api/health
```

The frontend defaults to a same-origin API base (`/api`) so local Docker Compose and nginx proxying work without CORS issues. Set `VITE_API_BASE` only when you intentionally want the frontend to call a different API host directly.

For production, use `docker-compose.prod.yml` instead of the local `docker-compose.yml`. The prod compose file does not publish Postgres or FastAPI directly to the host; nginx remains the only public entrypoint on port 80.

No test or lint commands are configured in this project.

## Architecture

This is a full-stack MTG Commander game tracker with a React frontend, FastAPI backend, and PostgreSQL database.

**Dev request flow:** Browser → Vite dev server (port 5173) → `/api/*` proxied to FastAPI (port 3001) → PostgreSQL

**Prod request flow:** Browser → Cloudflare (SSL) → nginx (port 80) → static files or `/api/*` proxied to FastAPI (port 3001, internal) → PostgreSQL

No CORS middleware on FastAPI — nginx handles same-origin routing so it's not needed.

### Frontend (`client/src/`)

`App.jsx` is a view-state machine with four states: `landing` → `setup` → `dashboard` → `history`. It owns top-level state (`gameId`, `players` array, `gameStartTime`) and passes it down as props.

- **LandingPage** — Marketing/welcome screen with hero, feature highlights, and CTAs linking to setup and history
- **GameSetup** — Creates a new game: collects player count, starting life, per-player name and commander. Commander name is required; color identity is auto-populated from Scryfall when a commander is selected. POST `/api/games` to get `gameId` and player IDs
- **CommanderInput** — Autocomplete input for commander names; debounces 300ms, fetches suggestions from `/api/cards/autocomplete`, then resolves color identity via `/api/cards/lookup` on selection
- **Dashboard** — Active game UI: elapsed timer (1s interval), turn counter, PlayerCard grid, end-game modal that POSTs to `/api/games/:id/complete`
- **PlayerCard** — Manages one player's local state (life, poison, commander damage per opponent, eliminated status); glow color driven by commander color identity
- **GameHistory** — Color win rate stats panel (`ColorStats`) above a table of completed games; rows expand via GET `/api/games/:id` (lazy-loaded on click)
- **ColorStats** — Fetches `/api/games/stats/colors` and renders a win rate bar chart per mana color (W/U/B/R/G)

### Backend (`server/`)

FastAPI application in `server/app/`. Uses SQLAlchemy async with raw `text()` queries and asyncpg. Transactions use `async with session.begin()`.

```
server/
├── app/
│   ├── main.py          # FastAPI app, router mounts, lifespan (httpx client) — no CORS middleware
│   ├── config.py        # pydantic-settings reading DB_* env vars
│   ├── database.py      # async engine, session factory
│   ├── models.py        # SQLAlchemy ORM models (mirrors schema.sql)
│   ├── schemas.py       # Pydantic request/response models (camelCase)
│   ├── routers/
│   │   ├── games.py     # 6 game endpoints (includes /stats/colors)
│   │   └── cards.py     # Scryfall proxy endpoints (lookup + autocomplete)
│   ├── services/
│   │   └── scryfall.py  # httpx AsyncClient wrapper (lookup, autocomplete)
│   └── auth/
│       ├── dependencies.py  # get_current_user (returns None until activated)
│       └── jwt.py           # create_token / decode_token stubs
├── schema.sql
├── requirements.txt
└── Dockerfile
```

```
client/
├── src/             # React source
├── Dockerfile       # Multi-stage: node build → nginx serve
└── nginx.conf       # Serves static files; proxies /api/ to api:3001
```

API endpoints:
- `POST /api/games` — create game + players
- `GET /api/games` — list completed games
- `GET /api/games/stats/colors` — win rate per mana color (W/U/B/R/G)
- `GET /api/games/{id}` — full game details
- `POST /api/games/{id}/complete` — finalize with winner/results
- `GET /api/cards/autocomplete?query=<name>` — Scryfall name suggestions (up to 8)
- `GET /api/cards/lookup?query=<name>` — Scryfall card image + color identity
- `GET /api/health` — health check

**Important:** `/api/games/stats/colors` must remain defined before `/{id}` in `games.py` to avoid routing ambiguity.

### Database

Three tables in `server/schema.sql` (auto-loaded by Docker Compose on first run):
- `games` — one row per match (started_at, completed_at, winner_name, etc.)
- `game_players` — N players per game (commander_colors is a `TEXT[]` column)
- `game_events` — audit log (exists for future use, not heavily used currently)

### Styling

Tailwind CSS with a custom MTG dark theme. Key custom values in `tailwind.config.js`:
- Gold accent: `#c9a84c` (class `gold`)
- Mana colors: `mana-w/u/b/r/g` matching MTG color identity
- Dark backgrounds: `#0d1117` (page), `#1c2230` (cards)
- Fonts: Cinzel (headings, loaded from Google Fonts) + Inter (body)

### Environment Variables (server)

| Var | Default |
|-----|---------|
| `APP_ENV` | `development` |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` |
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `mtg_app` |
| `DB_USER` | `postgres` |
| `DB_PASSWORD` | `postgres` |
| `JWT_SECRET_KEY` | `changeme` |
| `JWT_ALGORITHM` | `HS256` |

### Deployment

Hosted on a DigitalOcean droplet. SSL is handled by Cloudflare (Flexible mode) — Cloudflare terminates HTTPS and forwards HTTP to the droplet on port 80. No certificate is needed on the droplet itself. Do not add SSL/certbot to the nginx container; Cloudflare handles it.

Before production deploy:
- Create a real `.env` from `deploy.prod.env.example`
- Replace default DB and JWT secrets with strong random values
- Set `ALLOWED_HOSTS` to the real public hostnames served by Cloudflare
- Start with `docker compose --env-file .env -f docker-compose.prod.yml up -d --build`
