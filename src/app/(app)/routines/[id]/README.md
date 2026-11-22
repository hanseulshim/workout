# [id]

App Router segment `/routines/[id]` displaying a routine's details, volume-over-time chart, recent session history, export/delete/edit/start actions, and ordered exercise set targets.

## Interface

- `[page.tsx:metadata]` — Static Next.js metadata (`{ title: "Routine | Workout" }`).
- `[page.tsx:RoutineDetailPage]` — Async Server Component receiving `{ params: Promise<{ id: string }> }`; renders header actions (`RoutineExportButton`, `RoutineDeleteButton`, link to `/routines/${id}/edit`, link to `/workout/start?routine=${id}`), `RoutineVolumeChart` (when `> 1` sessions), `SessionHistoryList`, and exercise target cards linking to `/progress/${ex.id}`.
- `[loading.tsx:Loading]` — Route loading fallback rendering a centered spinner.
- `[error.tsx:RoutineDetailError]` — Client error boundary rendering `ErrorView` with heading `"Failed to load routine"`.
- Subdirectory: [`./edit/README.md`](./edit/README.md) — Routine editor route `/routines/[id]/edit`.

## Invariants

- `[page.tsx:RoutineDetailPage]` — Redirects unauthenticated users to `/auth/login`; scopes `routines` and `workout_sessions` queries by `user_id`, calling `notFound()` on missing routine (`PGRST116`) and throwing other Supabase errors.
- `[page.tsx:RoutineDetailPage]` — Normalizes `routine_exercises.exercises` from array or object, sorts exercises ascending by `position`, and excludes rows with a null `exercises` relation.
- `[page.tsx:RoutineDetailPage]` — Fetches at most `20` recent `workout_sessions` ordered descending by `started_at`, then reverses them chronologically to build `volumeBySession`; only renders `RoutineVolumeChart` when `volumeBySession.length > 1`.
- `[page.tsx:RoutineDetailPage]` — Falls back to `"lbs"` when no `weight_unit` is present on fetched sets, and falls back to `default_sets` / `default_reps` when `set_targets` is empty or null.

## Side Effects

- `[page.tsx:RoutineDetailPage]` — Reads authenticated user session and queries Supabase `routines` (with `routine_exercises` and `exercises`), `workout_sessions`, and (when sessions exist) `workout_sets`.

## Verification

```bash
npm run lint && npm run build
```
