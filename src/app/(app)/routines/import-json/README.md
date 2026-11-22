# import-json

App Router segment `/routines/import-json` for importing a workout routine from AI-formatted JSON and matching exercise names against the user's exercise library.

## Interface

- `[page.tsx:metadata]` — Static Next.js metadata (`{ title: "Import Routine from JSON | Workout" }`).
- `[page.tsx:ImportJsonRoutinePage]` — Async Server Component that authenticates the user, defines an inline `"use server"` action `resolveExercises(names: string[])`, and renders `JsonRoutineImporter`.

## Invariants

- `[page.tsx:ImportJsonRoutinePage]` — Redirects unauthenticated users to `/auth/login`; the inline `resolveExercises` Server Action throws `"Not authenticated"` if the session is missing.
- `[page.tsx:ImportJsonRoutinePage]` — Matches incoming exercise names case-insensitively against the user's custom exercises and non-custom catalog (`user_id = u.id` or `is_custom = false`), preferring exact name matches before bidirectional substring matches, and defaults `logType` to `"weight_reps"` when unmatched.

## Side Effects

- `[page.tsx:ImportJsonRoutinePage]` — Reads authenticated user session; `resolveExercises` queries Supabase `exercises` table on demand when invoked from `JsonRoutineImporter`.

## Verification

```bash
npm run lint && npm run build
```
