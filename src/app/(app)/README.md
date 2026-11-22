# (app)

Authenticated application route group hosting the main navigation shell (`AppLayout`) and the root `/` dashboard (`DashboardPage`).

## Interface

- `[layout.tsx:AppLayout]` — Client Component wrapping child routes with `Sidebar`, `PwaInstallPrompt`, and (except on active workout routes) `Header`, `ActiveWorkoutBanner`, and `BottomNav`.
- `[page.tsx:metadata]` — Static Next.js metadata (`{ title: "Dashboard | Workout" }`).
- `[page.tsx:DashboardPage]` — Async Server Component rendering a time-of-day greeting, today's scheduled routines (or quick-start/new-routine CTAs), up to four other routines, up to three recent completed workouts, or a welcome card for new users.
- `[loading.tsx:DashboardLoading]` — Route loading skeleton for the dashboard view.
- `[error.tsx:AppError]` — Client error boundary rendering `ErrorView` with default heading.
- Subdirectories:
  - [`./exercises/README.md`](./exercises/README.md) — Exercise catalog and custom exercise management (`/exercises`).
  - [`./history/README.md`](./history/README.md) — Completed workout history list and session detail/duration editor (`/history`, `/history/[id]`).
  - [`./import/README.md`](./import/README.md) — Tabbed Hevy CSV and AI JSON routine importer (`/import`).
  - [`./progress/README.md`](./progress/README.md) — Muscle-group progress index and per-exercise progression charts (`/progress`, `/progress/[exerciseId]`).
  - [`./routines/README.md`](./routines/README.md) — Routine list, detail, builder, editor, and JSON importer (`/routines`, `/routines/new`, `/routines/import-json`, `/routines/[id]`, `/routines/[id]/edit`).
  - [`./workout/README.md`](./workout/README.md) — Workout start flow and active workout logging screen (`/workout/start`, `/workout/[id]`).

## Invariants

- `[layout.tsx:AppLayout]` — Hides `Header`, `ActiveWorkoutBanner`, and `BottomNav` and removes horizontal/bottom-nav padding on active workout pages (`pathname.startsWith("/workout/") && pathname !== "/workout/start"`).
- `[page.tsx:DashboardPage]` — Redirects unauthenticated users to `/auth/login` and rethrows Supabase query errors.
- `[page.tsx:DashboardPage]` — Fetches at most `3` completed (`finished_at IS NOT NULL`) `workout_sessions` ordered descending by `started_at`, partitions routines into `todayRoutines` (matching `new Date().getDay()`) and up to `4` `otherRoutines` ordered by `last_used_at` then `updated_at` descending.

## Side Effects

- `[page.tsx:DashboardPage]` — Reads authenticated user session and queries Supabase `workout_sessions` and `routines` tables in parallel.

## Verification

```bash
npm run lint && npm run build
```
