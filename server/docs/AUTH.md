# Clerk authentication and pod access

Implemented using Clerk session JWTs and the approved owner/admin/member roles. Frontend integration remains deferred.

## Configuration and sign-in flow

Clerk handles sign-in. Send its session token in `Authorization: Bearer <token>`. Swagger's **Authorize** button accepts the token. Cookies are not accepted by this backend.

Configure `CLERK_JWT_KEY` with the Clerk dashboard PEM public key (actual newlines), `CLERK_ISSUER` with the exact instance issuer, and `CLERK_AUTHORIZED_PARTIES` with comma-separated permitted frontend origins. Optional `CLERK_AUDIENCE` enforces the audience if configured for your tokens. Process environment is used; `.env` is not loaded automatically.

PyJWT with cryptography verifies RS256 signatures against the configured key, issuer, expiration, not-before/issued-at times, session ID, subject, and authorized party. Pending sessions are rejected. This follows Clerk's [manual session verification guidance](https://clerk.com/docs/guides/sessions/manual-jwt-verification). Public-key verification does not call Clerk; key rotation requires updating the configured key. Session revocation is recognized when the short-lived token expires; there is no live revocation lookup.

A signed-in user provisions their own local profile with POST `/api/v1/users` (first/last name and email). Its identity mapping comes exclusively from the verified token subject. Names/email are local profile data, not authentication or verified-email evidence. Existing email conflicts return 409 and never link an existing account. Subsequent user list/detail/update/delete routes are self-only; an authenticated caller without a local profile receives 403. Foreign user IDs return 404. Local profile deletion does not delete the Clerk account.

Missing/invalid tokens on protected routes return 401; missing verification configuration for a supplied token returns 503. A malformed/expired token is rejected even on public-capable routes. Health and framework documentation remain independent.

## Permissions

| Caller | Private history/statistics | Public completed history/statistics | Manage members/games/results | Change visibility/admin roles | Delete pod |
|---|---|---|---|---|---|
| Signed out / nonmember | Denied | Allowed | Denied | Denied | Denied |
| Registered pod member | Allowed | Allowed | Denied | Denied | Denied |
| Pod admin (registered member) | Allowed | Allowed | Allowed | Denied | Denied |
| Pod owner | Allowed | Allowed | Allowed | Allowed | Allowed |

The verified creator owns each new pod, becomes an initial registered member, and cannot submit someone else as owner. Owner membership is added if absent and counts toward the 100-member input bound. Ownership is distinct from `is_admin`.

- PATCH `/api/v1/pods/{pod_id}/visibility` with `{is_public: true|false}` is owner-only; new pods default to private.
- PUT `/api/v1/pods/{pod_id}/admins/{user_id}` with `{is_admin: true|false}` is owner-only; the target must already be a registered pod member.
- Owner membership cannot be removed or reassigned. Removed/reassigned member identities lose admin grants; whole-member replacement clears admin grants and preserves owner membership.
- Nonmembers receive 404 for private resources. Registered members lacking write/admin/owner powers receive 403. Guest player records do not establish a caller identity.
- GET `/pods` and pod detail are for owners/members only. Game lists filter authorized private games plus completed games of public pods before pagination. Public game detail/results expose only completed games. Public statistics expose member IDs/counts and card/color metadata, never user profile emails or the full pod membership response.
- Pod access locks serialize mutations and permission changes. Game-result/player replacement concurrency rules still apply.

## Migration and existing records

Run `uv run --locked python -m app.migrate` explicitly to apply `v002__add_clerk_and_pod_access.sql`. The applied initial migration is unchanged. New columns link local users to Clerk subjects and pods to owners/visibility.

Existing users remain unlinked; existing pods have null owners and private visibility. No email/ID-based linking, owner guessing, or public backfill occurs. Existing admin rows remain data and do not become owners. Explicit reviewed account linking and ownership backfill are separate future work; no live data migration was performed.

Ownership transfer and owner-account deletion semantics are deferred. For now, an owner cannot delete their local profile while owning pods (409); the application does not cascade-delete those pods. Owners may explicitly delete pods through the owner-only pod endpoint.

## Verification

Local RSA-signed test sessions verify real token signatures/claims, without dependency overrides bypassing access control. PostgreSQL tests cover role permissions, private/public reads and visibility reversal, collections before pagination, direct foreign IDs, user isolation, email takeover prevention, owner guards, admin revocation, populated-schema migration defaults, rollback, and existing result concurrency. Real Clerk tenant / frontend sign-in smoke verification remains for integration with the client.
