# exercises

App Router segment `/exercises` displaying the searchable exercise catalog and custom exercise management via `ExerciseList`.

## Interface

- `[page.tsx:metadata]` — Static Next.js metadata (`{ title: "Exercises | Workout" }`).
- `[page.tsx:ExercisesPage]` — Async Server Component querying default (`is_custom = false`) and user-owned (`user_id = user.id`) exercises ordered by `name`, then rendering `ExerciseList`.
- `[loading.tsx:ExercisesLoading]` — Route loading skeleton mimicking the search bar, filter chips, and exercise card list.

## Invariants

- `[page.tsx:ExercisesPage]` — Redirects unauthenticated users to `/auth/login` and filters `exercises` to built-in or user-owned records ordered ascending by `name`.

## Side Effects

- `[page.tsx:ExercisesPage]` — Reads authenticated user session and queries Supabase `exercises` table.

## Verification

```bash
npm run lint && npm run build
```
