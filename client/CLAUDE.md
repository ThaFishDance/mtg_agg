# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Start Development

**Full stack via Docker Compose (recommended):**
```bash
docker compose up -d   # starts PostgreSQL + Next.js (port 3000)

docker compose --env-file .env.local up -d --build
```

**Local (no Docker):**
```bash
npm install
# requires a local PostgreSQL instance; copy .env.local.example to .env.local and set DATABASE_URL
npx prisma generate
npm run dev            # Next.js dev server on port 3000
```

**Production build (droplet):**
```bash
git pull
cp deploy.prod.env.example .env.local
# edit .env.local — set POSTGRES_PASSWORD and update DATABASE_URL password to match
docker compose --env-file .env.local -f docker-compose.prod.yml up -d --build
```

**Local URLs:**
```
App:          http://localhost:3000
Health check: http://localhost:3000/api/health
```

**Tests:**
```bash
npm test          # run once
npm run test:watch # watch mode
```

No lint command is configured.

## Architecture

Full-stack Next.js 15 app (App Router) with Prisma ORM and PostgreSQL.

**Dev request flow:** Browser → Next.js dev server (port 3000) → Prisma → PostgreSQL

**Prod request flow:** Browser → Cloudflare (SSL, port 443) → Droplet port 8080 → Next.js standalone server (port 3000 inside container) → PostgreSQL

Cloudflare is configured in Flexible SSL mode — it terminates HTTPS and forwards HTTP to the droplet on port 8080. No certificate is needed on the droplet. Do not add certbot or TLS termination inside the containers.

### Frontend (`src/app/`, `src/components/`)

Next.js App Router. Pages are under `src/app/` as `page.tsx` files; API routes are under `src/app/api/` as `route.ts` files.

**Game tracker pages:**
- **`/`** — Landing/welcome screen
- **`/setup`** — Creates a new game: player count, starting life, per-player name and commander. POSTs to `/api/games`, then navigates to `/game/[id]`
- **`/game/[id]`** — Active game UI: elapsed timer, turn counter, PlayerCard grid, end-game modal that POSTs to `/api/games/[id]/complete`
- **`/history`** — Color win rate stats (`ColorStats`) above a table of completed games; rows expand via `GET /api/games/[id]`

**Deck builder pages:**
- **`/decks`** — Lists all saved decks
- **`/decks/new`** — Form to create a new deck
- **`/decks/[id]`** — Deck detail: card list, stats, search, and import

**Key components:**
- **NavBar** — Top nav with Clerk auth UI: shows `SignInButton`/`SignUpButton` when signed out, nav links + `UserButton` when signed in
- **CommanderInput** — Autocomplete input; debounces 300 ms, fetches from `/api/cards/autocomplete`, resolves color identity via `/api/cards/lookup` on selection
- **PlayerCard** — Life, poison, commander damage per opponent, eliminated status; glow driven by commander color identity
- **ManaPip / ManaSymbol** — Renders individual mana color symbols
- **DeckCardList** — Renders grouped card list for a deck
- **DeckCardSearch** — Card search/add UI within a deck
- **DeckImportModal** — Bulk import cards into a deck (up to 500 cards via `/api/decks/[id]/cards/bulk`)
- **DeckStats** — Summary stats for a deck (card counts by category)
- **ColorStats** — Win-rate bar per mana color, fetched from `/api/games/stats/colors`

### Authentication

Clerk (`@clerk/nextjs`) handles auth. `ClerkProvider` wraps the entire app in `src/app/layout.tsx`.

**Middleware:** `src/proxy.ts` exports `clerkMiddleware()` and the route matcher config. **Note:** Next.js requires this file to be named `src/middleware.ts` to run as middleware — rename it if auth isn't gating routes.

Nav links (`/setup`, `/decks`, `/history`) are only rendered to signed-in users via Clerk's `<Show when="signed-in">` component. Signed-out users see `SignInButton` / `SignUpButton`.

### Backend (`src/app/api/`, `src/lib/`)

Next.js Route Handlers (no separate server process). Database access via Prisma Client singleton in `src/lib/db.ts`. All POST/PUT bodies are Zod-validated.

**Game endpoints:**
- `POST /api/games` — create game + players
- `GET /api/games` — list completed games
- `GET /api/games/stats/colors` — win rate per mana color (W/U/B/R/G); uses `$queryRaw` with `Prisma.sql`
- `GET /api/games/[id]` — full game details
- `POST /api/games/[id]/complete` — finalize with winner/results

**Deck endpoints:**
- `GET /api/decks` — list all decks (includes card count)
- `POST /api/decks` — create deck
- `GET /api/decks/[id]` — deck with all cards (ordered by category, then name)
- `PUT /api/decks/[id]` — update deck name/commander
- `DELETE /api/decks/[id]` — delete deck (cascades to cards)
- `POST /api/decks/[id]/cards` — add single card (`cardName`, `category`: `commander|mainboard`)
- `DELETE /api/decks/[id]/cards/[cardId]` — remove card
- `POST /api/decks/[id]/cards/bulk` — bulk add up to 500 cards

**Card/utility endpoints:**
- `GET /api/cards/autocomplete?query=<name>` — Scryfall name suggestions (up to 8)
- `GET /api/cards/lookup?query=<name>` — Scryfall card image + color identity
- `GET /api/health` — health check

`src/lib/scryfall.ts` wraps Scryfall API calls for autocomplete and card lookup.

### Database

Managed by Prisma. Schema defined in `prisma/schema.prisma`; `prisma/init.sql` is used by Docker Compose to initialize the DB on first volume creation.

Five tables:
- `games` — one row per match (`started_at`, `completed_at`, `winner_name`, etc.)
- `game_players` — N players per game (`commander_colors` is a `TEXT[]` column)
- `game_events` — audit log (exists for future use, not heavily used)
- `decks` — saved deck (`name`, `commander_name`, `commander_colors`)
- `deck_cards` — cards in a deck (`card_name`, `quantity`, `category`: `commander|mainboard`)

Run `npx prisma generate` after any schema change. Use `npx prisma db push` to sync schema changes to a dev database.

### Styling

Tailwind CSS with a custom MTG dark theme. Key custom values in `tailwind.config.ts`:
- Gold accent: `#c9a84c`
- Mana colors: `mana-w/u/b/r/g` matching MTG color identity
- Dark backgrounds: `#0d1117` (page), `#1c2230` (cards)
- Fonts: Cinzel (headings) + Inter (body), loaded via `next/font/google`

### Environment Variables

| Var | Used by | Notes |
|-----|---------|-------|
| `DATABASE_URL` | Next.js (Prisma) | Full PostgreSQL connection string |
| `POSTGRES_DB` | Docker Compose (db service) | Database name |
| `POSTGRES_USER` | Docker Compose (db service) | DB username |
| `POSTGRES_PASSWORD` | Docker Compose (db service) | DB password — must match `DATABASE_URL` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk (client) | Publishable key from Clerk dashboard |
| `CLERK_SECRET_KEY` | Clerk (server) | Secret key from Clerk dashboard |

Set these in `.env.local` for local dev or pass via `--env-file .env` for production.

### Deployment

Hosted on a DigitalOcean droplet. SSL is handled by Cloudflare (Flexible mode).

Cloudflare origin port: **80** (mapped to Next.js container port 3000 in `docker-compose.prod.yml`).

Before production deploy:
1. `cp deploy.prod.env.example .env`
2. Set `POSTGRES_PASSWORD` to a strong random value
3. Update `DATABASE_URL` so the password matches
4. `docker compose --env-file .env -f docker-compose.prod.yml up -d --build`

The production compose does not publish Postgres to the host; only port 8080 is public.
