# progress

App Router segment `/progress` grouping the user's logged exercises by muscle group with their most recent logged set.

## Interface

- `[page.tsx:metadata]` — Static Next.js metadata (`{ title: "Progress | Workout" }`).
- `[page.tsx:ProgressPage]` — Async Server Component invoking `get_user_exercises` and `get_user_last_sets` RPCs, grouping exercises by muscle group in `MUSCLE_GROUP_ORDER`, and linking each item to `/progress/${ex.id}`.
- `[loading.tsx:ProgressLoading]` — Default route loading skeleton for the exercise progress list.
- `[loading.tsx:ProgressChartsLoading]` — Named skeleton component for exercise progress charts.
- `[error.tsx:ProgressError]` — Client error boundary rendering `ErrorView` with heading `"Failed to load progress"`.
- Subdirectory: [`./[exerciseId]/README.md`](./[exerciseId]/README.md) — Per-exercise progression charts (`/progress/[exerciseId]`).

## Invariants

- `[page.tsx:ProgressPage]` — Redirects unauthenticated users to `/auth/login` and rethrows RPC errors from `get_user_exercises` or `get_user_last_sets`.
- `[page.tsx:ProgressPage]` — Renders muscle groups strictly in `MUSCLE_GROUP_ORDER`, omitting groups with no logged exercises, and formats duration sets as `m:ss` (when `>= 60s`) or `<n>s`, weighted sets as `<weight> <unit> × <reps>`, and rep-only sets as `<reps> reps`.

## Side Effects

- `[page.tsx:ProgressPage]` — Reads authenticated user session and executes Supabase RPCs `get_user_exercises` and `get_user_last_sets` in parallel.

## Verification

```bash
npm run lint && npm run build
```
