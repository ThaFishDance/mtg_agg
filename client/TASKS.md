# Mobile-first frontend rebuild

## Direction and acceptance rules

Start from the minimal Next.js/Clerk shell. FastAPI is the domain backend.
The previous profile/pods implementation is superseded by this reset.

For every UI task:

- Design the phone layout first using a single column by default; progressively
  enhance for tablet and desktop rather than shrinking a desktop layout.
- Check 320, 375, 768 and 1280 CSS-pixel widths. No page-level horizontal overflow;
  readable content and usable forms at 200% zoom.
- Use touch targets of at least 44 by 44 CSS pixels for app-controlled actions,
  visible keyboard focus, semantic labels and accessible error/status messages.
- Avoid hover-only interactions. Keep primary actions reachable, support mobile
  keyboards, and preserve entered data after recoverable failures.
- Verify loading, empty, success, validation, unauthorized and network-error
  states. Verify phone and desktop behavior before marking a flow complete.

## Completed

- [x] **UI-000 — Reset the frontend.** Remove existing feature pages, all Next.js
  API handlers, unused feature components/helpers, and unfinished Pods work.
  Keep a minimal homepage, layout and Clerk auth shell. No backend or data reset.

## Next

- [ ] **UI-001 — Mobile-first UI foundation.** Establish spacing, typography,
  colors, responsive content widths, buttons, form fields and status patterns.
  Review the phone shell/navigation first, then tablet and desktop; meet all
  acceptance rules above. No feature pages in this task.
- [ ] **UI-002 — Sign-in and profile onboarding.** Build the phone-first sign-in
  return flow and explicit profile-confirmation form, prefilled from Clerk with
  missing fields editable. Integrate FastAPI through explicit authenticated
  Next.js handlers; preserve backend validation and account-conflict behavior.
  Test token forwarding, session expiry, retry, and no email-based account linking.
- [ ] **UI-003 — Pods.** After UI-002, add a mobile-first owned/joined pod list,
  bounded pagination and private owner-only creation using existing FastAPI
  contracts. Label pods by ID; automatic owner membership. Test empty, loading,
  failure and duplicate-submission prevention plus cross-account isolation.

## Later, split into reviewable tasks before implementation

- [ ] **UI-004 — Games.** Design phone-first setup, active-game controls and
  result completion against the approved backend contracts. Confirm additional
  live tracking/lifecycle requirements before implementation.
- [ ] **UI-005 — History and statistics.** Pod-scoped history and player,
  commander and color statistics. Use readable mobile cards/lists and adapt
  comparisons for larger displays; verify private/public permissions.
- [ ] **UI-006 — Deferred domains.** Design decks, inventory and card search only
  after their backend scope and contracts are approved and implemented.

## Release verification

- [ ] Run client tests, TypeScript checks and production build for each flow;
  add meaningful tests with the new behavior, rather than retaining legacy tests.
- [ ] Perform browser checks at the widths above and a real-phone smoke check
  when available; record any unavailable checks explicitly.
- [ ] Verify a real Clerk development tenant and two-account isolation before
  calling authentication integration complete. Deployment, identity backfill,
  ownership transfer and production migration remain separate tasks.
