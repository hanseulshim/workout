# history

App Router segment `/history` listing the user's completed workout sessions with relative timestamps and duration badges.

## Interface

- `[page.tsx:metadata]` — Static Next.js metadata (`{ title: "History | Workout" }`).
- `[page.tsx:HistoryPage]` — Async Server Component rendering completed `workout_sessions` as a responsive card grid linking to `/history/${session.id}`.
- `[loading.tsx:HistoryLoading]` — Route loading skeleton displaying five placeholder session cards.
- `[error.tsx:HistoryError]` — Client error boundary rendering `ErrorView` with heading `"Failed to load history"`.
- Subdirectory: [`./[id]/README.md`](./[id]/README.md) — Workout session detail view and inline duration editor (`/history/[id]`).

## Invariants

- `[page.tsx:HistoryPage]` — Redirects unauthenticated users to `/auth/login` and rethrows Supabase query errors.
- `[page.tsx:HistoryPage]` — Only includes finished sessions (`finished_at IS NOT NULL`) owned by `user.id`, ordered descending by `started_at` and capped at `200` rows.

## Side Effects

- `[page.tsx:HistoryPage]` — Reads authenticated user session and queries Supabase `workout_sessions` table.

## Verification

```bash
npm run lint && npm run build
```
