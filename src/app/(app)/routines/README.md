# routines

App Router segment `/routines` listing the user's workout routines sorted by recent activity with day-of-week filtering and a link to create a new routine.

## Interface

- `[page.tsx:metadata]` — Static Next.js metadata (`{ title: "Routines | Workout" }`).
- `[page.tsx:RoutinesPage]` — Async Server Component fetching user routines with exercise counts, sorting by most recent `last_used_at ?? updated_at`, and rendering `RoutineListWithFilter` alongside a link to `/routines/new`.
- `[loading.tsx:RoutinesLoading]` — Route loading skeleton showing header and four routine card placeholders.
- `[error.tsx:RoutinesError]` — Client error boundary rendering `ErrorView` with heading `"Failed to load routines"`.
- Subdirectories:
  - [`./[id]/README.md`](./[id]/README.md) — Routine detail view, volume chart, session history, and exercise targets (`/routines/[id]`), with child [`./[id]/edit/README.md`](./[id]/edit/README.md).
  - [`./import-json/README.md`](./import-json/README.md) — AI-formatted JSON routine importer (`/routines/import-json`).
  - [`./new/README.md`](./new/README.md) — New routine builder (`/routines/new`).

## Invariants

- `[page.tsx:RoutinesPage]` — Redirects unauthenticated users to `/auth/login`, scopes `routines` to `user.id`, and rethrows Supabase query errors.
- `[page.tsx:RoutinesPage]` — Sorts routines descending by `last_used_at ?? updated_at` without mutating the raw response array, and extracts `exerciseCount` from the aggregated `routine_exercises(count)` relation (defaulting to `0`).

## Side Effects

- `[page.tsx:RoutinesPage]` — Reads authenticated user session and queries Supabase `routines` table with `routine_exercises(count)` aggregation.

## Verification

```bash
npm run lint && npm run build
```
