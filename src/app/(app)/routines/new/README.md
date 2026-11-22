# new

App Router segment `/routines/new` for creating a new workout routine via `RoutineBuilder`.

## Interface

- `[page.tsx:metadata]` — Static Next.js metadata (`{ title: "New Routine | Workout" }`).
- `[page.tsx:NewRoutinePage]` — Async Server Component that authenticates the user, loads the alphabetically ordered exercise catalog, and renders `RoutineBuilder`.
- `[loading.tsx:Loading]` — Route loading fallback rendering a centered spinner.

## Invariants

- `[page.tsx:NewRoutinePage]` — Redirects unauthenticated users to `/auth/login` and rethrows Supabase query errors.

## Side Effects

- `[page.tsx:NewRoutinePage]` — Reads authenticated user session and queries Supabase `exercises` table.

## Verification

```bash
npm run lint && npm run build
```
