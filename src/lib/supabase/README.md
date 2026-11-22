# supabase

Supabase SSR client factories for browser and Next.js server environments using `@supabase/ssr`.

## Interface

- `createClient()` `[client.ts:createClient]` — Returns a browser Supabase client via `createBrowserClient`.
- `createClient()` (async) `[server.ts:createClient]` — Returns a server Supabase client via `createServerClient`, bound to the Next.js request cookie store.

## Invariants

- Requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to be defined in `process.env` (non-null asserted) `[client.ts:createClient]`, `[server.ts:createClient]`.
- Errors thrown by `cookieStore.set` inside `setAll` are caught and ignored so `createClient()` can be called from read-only Next.js Server Components while middleware handles session refresh `[server.ts:createClient]`.

## Side Effects

- Reads `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` `[client.ts:createClient]`, `[server.ts:createClient]`.
- Reads and writes HTTP cookies through `next/headers` `cookies()` (`getAll` and `set`) `[server.ts:createClient]`.

## Verification

```bash
npm run lint && npm run build
```
