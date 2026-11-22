# callback

App Router route handler `/auth/callback` exchanging Supabase OAuth/magic-link authorization codes for a session.

## Interface

- `[route.ts:GET]` — Async GET handler reading the `code` query parameter from `request.url`, exchanging it for a Supabase session when present, and redirecting to `${origin}/`.

## Invariants

- `[route.ts:GET]` — Always redirects to `${origin}/` regardless of whether a `code` query parameter is present.

## Side Effects

- `[route.ts:GET]` — Calls `supabase.auth.exchangeCodeForSession(code)` when `code` is non-empty, setting auth session cookies on the response.

## Verification

```bash
npm run lint && npm run build
```
