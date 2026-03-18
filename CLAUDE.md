# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Start Development

**Database (required first):**
```bash
docker-compose up -d   # starts PostgreSQL on port 5432, auto-loads schema.sql
```

**Backend (port 3001):**
```bash
cd server && npm install && npm run dev   # nodemon with hot-reload
```

**Frontend (port 5173):**
```bash
cd client && npm install && npm run dev   # Vite dev server
```

**Production build:**
```bash
cd client && npm run build   # outputs to client/dist/
cd server && npm start       # node index.js (no hot-reload)
```

No test or lint commands are configured in this project.

## Architecture

This is a full-stack MTG Commander game tracker with a React frontend, Express backend, and PostgreSQL database.

**Request flow:** Browser → Vite dev server → `/api/*` proxied to Express (port 3001) → PostgreSQL

### Frontend (`client/src/`)

`App.jsx` is a view-state machine with three states: `setup` → `dashboard` → `history`. It owns top-level state (`gameId`, `players` array, `gameStartTime`) and passes it down as props.

- **GameSetup** — Creates a new game: collects player count, starting life, per-player name/commander/color identity, then POST `/api/games` to get `gameId` and player IDs
- **Dashboard** — Active game UI: elapsed timer (1s interval), turn counter, PlayerCard grid, end-game modal that POSTs to `/api/games/:id/complete`
- **PlayerCard** — Manages one player's local state (life, poison, commander damage per opponent, eliminated status); glow color driven by commander color identity
- **GameHistory** — Table of completed games; expands rows via GET `/api/games/:id` (lazy-loaded on click)

### Backend (`server/`)

Single router at `server/routes/games.js` mounted under `/api/games`. Uses `pg` Pool (configured via env vars in `server/db.js`). Game creation and completion both run as transactions.

API endpoints:
- `POST /api/games` — create game + players
- `GET /api/games` — list completed games
- `GET /api/games/:id` — full game details
- `POST /api/games/:id/complete` — finalize with winner/results
- `GET /api/health` — health check

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
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `mtg_app` |
| `DB_USER` | `postgres` |
| `DB_PASSWORD` | `postgres` |
