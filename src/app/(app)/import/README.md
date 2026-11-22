# import

App Router segment `/import` providing a tabbed import experience for Hevy CSV workout history and AI-formatted JSON routines.

## Interface

- `[page.tsx:metadata]` — Static Next.js metadata (`{ title: "Import | Workout" }`).
- `[page.tsx:ImportPage]` — Async Server Component loading the user's exercise library, defining an inline `"use server"` action `resolveExercises(names: string[])`, and rendering `Tabs` with `HevyImportClient` (`"hevy"`) and `JsonRoutineImporter` (`"json"`).
- `[loading.tsx:Loading]` — Route loading fallback rendering a centered spinner.

## Invariants

- `[page.tsx:ImportPage]` — Redirects unauthenticated users to `/auth/login` on initial render; the inline `resolveExercises` Server Action independently verifies authentication and throws `"Not authenticated"` if absent.
- `[page.tsx:ImportPage]` — Matches exercise names case-insensitively against built-in and user-owned exercises (`user_id = u.id` or `is_custom = false`), preferring exact matches before bidirectional substring matches, and defaults `logType` to `"weight_reps"` when unmatched.

## Side Effects

- `[page.tsx:ImportPage]` — Reads authenticated user session and queries Supabase `exercises` table both on initial render and on demand inside `resolveExercises`.

## Verification

```bash
npm run lint && npm run build
```
