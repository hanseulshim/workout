# auth

Intermediate App Router namespace `/auth` grouping authentication entry pages and the Supabase OAuth/magic-link callback handler.

## Subdirectories

- [`./callback/README.md`](./callback/README.md) — `/auth/callback`: Exchanges a Supabase `code` query parameter for a session and redirects to `/`.
- [`./login/README.md`](./login/README.md) — `/auth/login`: Renders the centered `LoginForm` sign-in page.
- [`./signup/README.md`](./signup/README.md) — `/auth/signup`: Renders the centered `SignupForm` registration page.

## Verification

```bash
npm run lint && npm run build
```
