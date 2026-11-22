# [id]

App Router segment `/history/[id]` for inspecting a completed workout session, viewing sets grouped by exercise, and inline-editing the session duration.

## Interface

- `[page.tsx:metadata]` — Static Next.js metadata (`{ title: "Workout Detail | Workout" }`).
- `[page.tsx:WorkoutDetailPage]` — Async Server Component receiving `{ params: Promise<{ id: string }> }`; displays session header, date badge, `WorkoutDurationEditor`, total volume badge, sets grouped by exercise (adapting columns to `log_type`), and optional session notes.
- `[workout-duration-editor.tsx:WorkoutDurationEditor]` — Client Component (`{ sessionId, startedAt, finishedAt, initialDurationMin }`) allowing inline duration editing in minutes with keyboard shortcuts (`Enter` to save, `Escape` to cancel).
- `[actions.ts:updateWorkoutFinishedAt]` — Server Action `(sessionId: string, finishedAt: string)` updating `workout_sessions.finished_at` for the authenticated user and revalidating `/history/${sessionId}`.
- `[error.tsx:WorkoutDetailError]` — Client error boundary rendering `ErrorView` with heading `"Failed to load workout"`.

## Invariants

- `[page.tsx:WorkoutDetailPage]` — Redirects unauthenticated users to `/auth/login`; scopes `workout_sessions` query by `id` and `user_id`, calling `notFound()` when missing (`PGRST116`) and throwing other Supabase errors.
- `[actions.ts:updateWorkoutFinishedAt]` — Throws `"Unauthorized"` if no authenticated user exists and scopes the update by both `id` and `user_id`.
- `[workout-duration-editor.tsx:WorkoutDurationEditor]` — Parses input via `parseInt(value, 10)` (truncating decimals), rejects `NaN` or `<= 0` minute values via `toast.error` before invoking `updateWorkoutFinishedAt`, and computes `finished_at` as `startedAt + mins * 60 * 1000`.
- `[page.tsx:WorkoutDetailPage]` — Groups `workout_sets` by `exercise_id` preserving `completed_at` ascending order and formats duration sets (`log_type === "duration"`) as `m:ss` (when `>= 60s`) or `<n>s`.

## Side Effects

- `[page.tsx:WorkoutDetailPage]` — Reads authenticated user session and queries Supabase `workout_sessions` and `workout_sets` (joined with `exercises`).
- `[actions.ts:updateWorkoutFinishedAt]` — Mutates `workout_sessions.finished_at` in Supabase and calls `revalidatePath(\`/history/${sessionId}\`)`.
- `[workout-duration-editor.tsx:WorkoutDurationEditor]` — Invokes `[actions.ts:updateWorkoutFinishedAt]` and displays success/error notifications via `sonner` `toast`.

## Verification

```bash
npm run lint && npm run build
```
