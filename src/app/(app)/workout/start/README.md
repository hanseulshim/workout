# start

App Router segment `/workout/start` for selecting a routine (or starting an ad-hoc workout) with preloaded personal bests and prior session sets.

## Interface

- `[page.tsx:metadata]` — Static Next.js metadata (`{ title: "Start Workout | Workout" }`).
- `[page.tsx:WorkoutStartPage]` — Async Server Component receiving `{ searchParams: Promise<{ routine?: string }> }`; loads the user's routines, optional preselected routine, per-exercise personal bests, and last finished session's sets for the preselected routine, then renders `WorkoutStartClient`.
- `[loading.tsx:Loading]` — Route loading fallback rendering a centered spinner.
- `[error.tsx:WorkoutStartError]` — Client error boundary rendering `ErrorView` with heading `"Failed to load workout start"`.

## Invariants

- `[page.tsx:WorkoutStartPage]` — Redirects unauthenticated users to `/auth/login`; scopes `routines`, `workout_sessions`, and `workout_sets` (via `workout_sessions!inner(user_id)`) queries to `user.id`, throwing on `routinesError` or `bestsError`.
- `[page.tsx:WorkoutStartPage]` — Orders routines by `last_used_at` descending (`nullsFirst: false`) then `updated_at` descending.
- `[page.tsx:WorkoutStartPage]` — Computes `personalBests` per `exercise_id` as the maximum non-null `weight`, `reps`, and `duration_seconds` across all user sets.
- `[page.tsx:WorkoutStartPage]` — Only fetches `lastSets` when `?routine=` is provided and a completed (`finished_at IS NOT NULL`) session exists for that routine; normalizes `preselectedRoutine.routine_exercises[*].exercises` from array or object into a single object or `null`.

## Side Effects

- `[page.tsx:WorkoutStartPage]` — Reads authenticated user session and queries Supabase `routines` (with optional `routine_exercises`/`exercises` join), `workout_sets`, and optionally `workout_sessions`.

## Verification

```bash
npm run lint && npm run build
```
