# MTG Manager frontend

The Next.js 16 frontend provides Clerk sign-in and explicit profile onboarding
against FastAPI. Previous game, history, deck, inventory and card routes were
removed during the reset; those old URLs return 404. Pods are next.

## Development

From the repository root, install frontend dependencies and create the local
configuration if it does not already exist:

```sh
cd client
npm ci
cp -n .env.example .env.local
```

Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `.env.local`
to valid Clerk development keys; the example values are placeholders. Then run:

```sh
npm run dev
```

Open http://localhost:3000. After signing in, confirm your name and email and
select **Save profile** to create your backend user. An existing profile is
loaded by verified Clerk identity; email conflicts never link accounts.
The profile flow requires FastAPI and its Clerk verification configuration.
`BACKEND_URL` is server-only and defaults to `http://127.0.0.1:8000`.
The Next.js `/api/profile` handlers forward the session token to FastAPI;
the browser never connects directly to the backend.

Run both services with `make dev` from the repository root. Export
`CLERK_JWT_KEY`, `CLERK_ISSUER`, and `CLERK_AUTHORIZED_PARTIES` (including
`http://localhost:3000`) in that terminal first. See the
[backend auth setup](../server/docs/AUTH.md). Backend `.env` files are not loaded
automatically. Use the same Clerk instance for the client and backend.

To run the backend separately, open another terminal at the repository root
(requires Python 3.12 and uv):

```sh
cd server
uv run --locked python -m app local
```

This uses SQLite at `server/local.db`, preserving data across restarts without
requiring PostgreSQL. API docs: http://localhost:8000/docs. Authenticated endpoints
still require the backend Clerk configuration described in the
[backend README](../server/README.md).

Prisma schema and deployment files remain historical assets; the production
build no longer runs Prisma generation.

Run `npx tsc --noEmit` and `npm run build` to check the shell. `npm test` uses
Vitest, including authenticated profile-handler tests. The build needs valid
Clerk configuration and access to the Google Fonts used by the layout.

## UI direction

See [frontend tasks](TASKS.md). Design for phones first, then progressively adapt
to tablets and desktop. Build one complete flow at a time against the FastAPI
contracts; do not restore legacy Next.js database routes.

## Shared UI foundation

Use `Container` for responsive page widths, `.ui-section` for vertical page
spacing, `.ui-stack` for related sections, and `.ui-card` for grouped content.
Start with one column; add `sm:`/`lg:` adaptations only when the content needs it.
CSS variables in `globals.css` define surfaces, text, borders and semantic colors.
Use the default 4px Tailwind spacing scale (16px phone gutters, 24px tablet,
32px desktop). Body text is 16px; headings step from 30px to 36px.

- `Button`: primary, secondary or danger; defaults to `type="button"`. Set
  `type="submit"` explicitly in forms. `pending` disables the action and exposes
  `aria-busy`; supply meaningful text such as “Saving…”.
- `TextField`: required `label`, optional `hint` and `error`; labels and messages
  are associated with unique input IDs. Set `type`, `autoComplete`, and
  `inputMode` for the data being entered. Text remains controlled by the caller.
- `Status`: info, loading, empty, success or error, with a title, description and
  optional action. Errors use `role="alert"`; other messages use `role="status"`.

App controls are at least 44px high, fields use 16px text, keyboard focus is
visible, and the shell includes a skip link. Reduced-motion preferences disable
spinner motion. No new feature routes are introduced.

Run `npm test` for accessible HTML contracts. To repeat the Chromium fixture
checks without adding project dependencies, from `client/`:

```sh
npm install --prefix /tmp/mtg-ui-check playwright --no-audit --no-fund
node /tmp/mtg-ui-check/node_modules/playwright/cli.js install chromium
UI_PREVIEW_PATH=/tmp/mtg-ui-check/index.html npm test
node node_modules/tailwindcss/lib/cli.js -i src/app/globals.css -o /tmp/mtg-ui-check/ui.css
python3 -m http.server 8765 --bind 127.0.0.1 --directory /tmp/mtg-ui-check
# In another terminal, from client/:
PLAYWRIGHT_MODULE=/tmp/mtg-ui-check/node_modules/playwright node scripts/check-ui.cjs
```

The fixture exercises shell and component patterns at 320/375/768/1280px and
100%/200% CSS scaling, target sizes, computed variant styles, keyboard focus,
field entry, and reduced motion. It is not a live Clerk authentication test or
an operating-system/browser zoom test. Screenshots are written under `/tmp`.

The interactive profile fixture uses the real component with mocked Clerk and
HTTP responses. After compiling the fixture CSS as above, run:

```sh
PLAYWRIGHT_MODULE=/tmp/mtg-ui-check/node_modules/playwright node scripts/check-profile.cjs
```

It checks prefilling, network/validation/conflict failures, preserved form data,
retry, successful creation, signed-out and expired sessions, and responsive
layout at the same widths. This does not verify a live Clerk tenant.
