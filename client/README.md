# Frontend reset

The frontend is a minimal Next.js 16 shell with Clerk sign-in and a placeholder
homepage. Previous game, history, deck, inventory, card and API routes have been
removed, including the unfinished profile/pods integration. Old URLs return 404.
The FastAPI backend in `server/` is unchanged.

## Development

Run `npm ci`, configure Clerk development keys in `.env.local` using
`.env.example`, then run `npm run dev`. The shell does not require a database or
FastAPI connection. Prisma schema and deployment files remain historical assets;
the production build no longer runs Prisma generation.

Run `npx tsc --noEmit` and `npm run build` to check the shell. `npm test` uses
Vitest; feature tests will be added with the rebuilt flows. The build needs valid
Clerk configuration and access to the Google Fonts used by the layout.

## UI direction

See [frontend tasks](TASKS.md). Design for phones first, then progressively adapt
to tablets and desktop. Build one complete flow at a time against the FastAPI
contracts; do not restore legacy Next.js database routes.
