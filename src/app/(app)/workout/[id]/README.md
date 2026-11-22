# [id]

App Router segment `/workout/[id]` hosting the active workout logging screen for a specific session.

## Interface

- `[page.tsx:metadata]` — Static Next.js metadata (`{ title: "Active Workout | Workout" }`).
- `[page.tsx:ActiveWorkoutPage]` — Async Server Component receiving `{ params: Promise<{ id: string }> }` and rendering `ActiveWorkoutScreen` with `sessionId={id}`.
- `[loading.tsx:Loading]` — Route loading fallback rendering a centered spinner.
- `[error.tsx:ActiveWorkoutError]` — Client error boundary rendering `ErrorView` with heading `"Failed to load workout"`.

## Invariants

None

## Side Effects

None

## Verification

```bash
npm run lint && npm run build
```
