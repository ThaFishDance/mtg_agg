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
