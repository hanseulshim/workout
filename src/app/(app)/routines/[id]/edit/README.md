# edit

App Router segment `/routines/[id]/edit` for editing an existing workout routine via `RoutineBuilder`.

## Interface

- `[page.tsx:metadata]` — Static Next.js metadata (`{ title: "Edit Routine | Workout" }`).
- `[page.tsx:dynamic]` — Route segment config (`"force-dynamic"`).
- `[page.tsx:EditRoutinePage]` — Async Server Component receiving `{ params: Promise<{ id: string }> }`; loads the user's routine (with nested `routine_exercises` and `exercises`) and the ordered exercise catalog, then renders `RoutineBuilder`.
- `[loading.tsx:Loading]` — Route loading fallback rendering a centered spinner.
- `[error.tsx:EditRoutineError]` — Client error boundary rendering `ErrorView` with heading `"Failed to load routine editor"`.

## Invariants

- `[page.tsx:EditRoutinePage]` — Redirects unauthenticated users to `/auth/login`.
- `[page.tsx:EditRoutinePage]` — Scopes routine lookup by both `id` and `user_id`; treats Supabase `PGRST116` (no rows) as `notFound()`, while rethrowing all other query errors.
- `[page.tsx:EditRoutinePage]` — Normalizes each `routine_exercises.exercises` relation from an array or object into a single object (or `null`) before passing `routine` to `RoutineBuilder`.

## Side Effects

- `[page.tsx:EditRoutinePage]` — Reads authenticated user session and queries Supabase `routines` (with `routine_exercises` and `exercises` joins) and `exercises` tables in parallel.

## Verification

```bash
npm run lint && npm run build
```
