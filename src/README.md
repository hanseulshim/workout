# src

Application source tree for the Next.js App Router workout tracker, containing authentication middleware at the root and five child packages for routes, UI components, utilities, client state, and database types.

## Interface

### Local Symbols

- `middleware(request: NextRequest): Promise<NextResponse>` `[middleware.ts:middleware]` — Next.js Edge middleware that creates a Supabase SSR client via `createServerClient`, refreshes the authenticated session via `supabase.auth.getUser()`, redirects unauthenticated requests on non-`/auth` routes to `/auth/login`, and redirects authenticated requests on `/auth*` routes to `/`.
- `config` `[middleware.ts:config]` — Next.js middleware matcher configuration (`matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]`).

### Child Packages

| Package | Contract | Summary |
| --- | --- | --- |
| `app` | [./app/README.md](./app/README.md) | Next.js App Router layouts, route handlers, and pages for authentication, dashboard, routines, active workouts, history, progress, exercises, and data import. |
| `components` | [./components/README.md](./components/README.md) | Client React components for authentication, exercise catalog, Hevy CSV import, layout chrome, progress charts, routine builder/import/export, design-system primitives, active workout logging, theme, and PWA installation. |
| `lib` | [./lib/README.md](./lib/README.md) | Shared client/server utilities for Web Audio rest-timer chimes, Tailwind class merging, routine JSON export, and Supabase SSR client factories. |
| `store` | [./store/README.md](./store/README.md) | Persisted Zustand store (`useWorkoutStore`) managing active workout sessions, sets, supersets, PR detection, pause tracking, and rest timers. |
| `types` | [./types/README.md](./types/README.md) | TypeScript domain enums, Supabase `Database` schema types, and row-level entity aliases. |

## Invariants

- Every matched request outside `/auth*` requires a valid Supabase user from `supabase.auth.getUser()`; otherwise the request is redirected to `/auth/login` `[middleware.ts:middleware]`.
- Authenticated users navigating to any `/auth*` path are redirected to `/` `[middleware.ts:middleware]`.
- Requires `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (non-null asserted) `[middleware.ts:middleware]`.
- Static assets (`_next/static`, `_next/image`, `favicon.ico`, `icons`, `manifest.json`, `sw.js`, and image extensions `.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`) bypass middleware execution `[middleware.ts:config]`.

## Side Effects

- Reads `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` `[middleware.ts:middleware]`.
- Performs a network call to Supabase Auth (`supabase.auth.getUser()`) on every matched request `[middleware.ts:middleware]`.
- Reads incoming request cookies and mutates both `request.cookies` and `NextResponse` cookies when Supabase refreshes auth tokens via `setAll` `[middleware.ts:middleware]`.

## Verification

```bash
npm run lint && npm run build
```
