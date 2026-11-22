# [exerciseId]

App Router segment `/progress/[exerciseId]` displaying historical progression charts for a single exercise.

## Interface

- `[page.tsx:metadata]` — Static Next.js metadata (`{ title: "Exercise Progress | Workout" }`).
- `[page.tsx:ExerciseProgressPage]` — Async Server Component receiving `{ params: Promise<{ exerciseId: string }> }`; loads the exercise and up to 200 user-owned `workout_sets`, then renders `ProgressCharts`.

## Invariants

- `[page.tsx:ExerciseProgressPage]` — Redirects unauthenticated users to `/auth/login` and calls `notFound()` when the exercise does not exist.
- `[page.tsx:ExerciseProgressPage]` — Filters `workout_sets` to the authenticated user via an inner join on `workout_sessions.user_id` (`user.id`), ordered ascending by `completed_at` and capped at `200` rows.

## Side Effects

- `[page.tsx:ExerciseProgressPage]` — Reads authenticated user session and queries Supabase `exercises` and `workout_sets` (inner-joined with `workout_sessions`).

## Verification

```bash
npm run lint && npm run build
```
