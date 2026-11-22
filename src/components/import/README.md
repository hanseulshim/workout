# import

Multi-phase Hevy CSV workout history importer supporting CSV parsing, exercise name remapping/exclusion, routine generation, and idempotent session/set ingestion into Supabase.

## Interface

- `[hevy-import-client.tsx:HevyImportClient]` — Top-level state machine (`"idle" | "preview" | "importing" | "done"`) coordinating CSV upload, preview/mapping, progress display, and summary reporting.
- `[hevy-import-upload-card.tsx:HevyImportUploadCard]` — File picker card accepting `.csv,text/csv` exports.
- `[hevy-import-preview.tsx:HevyImportPreview]` — Preview view showing parse warnings, summary stats (sessions, routines, exercises to create), `[hevy-import-exercise-mapping-card.tsx:HevyImportExerciseMappingCard]`, and import/reset actions.
- `[hevy-import-exercise-mapping-card.tsx:HevyImportExerciseMappingCard]` — Expandable exercise list with inline rename, match/create status badges, skip/include toggle, and per-session set history preview.
- `[hevy-import-progress-card.tsx:HevyImportProgressCard]` — Progress bar card showing `completed/total` sessions imported.
- `[hevy-import-summary-card.tsx:HevyImportSummaryCard]` — Post-import summary showing imported, repaired, skipped, and rolled-back session counts plus created exercises/routines.
- `[use-hevy-import-exercise-state.ts:useHevyImportExerciseState]` — Hook managing exercise remaps, inline edit state, exclusion set, expansion set, and `newExerciseCount`.
- `[hevy-import-utils.ts:normalizeName]`, `[hevy-import-utils.ts:inferMuscleGroup]`, `[hevy-import-utils.ts:toInt]`, `[hevy-import-utils.ts:toFloat]`, `[hevy-import-utils.ts:parseCSV]`, `[hevy-import-utils.ts:parseHevyDate]`, `[hevy-import-utils.ts:inferLogType]`, `[hevy-import-utils.ts:buildPreviewData]`, `[hevy-import-utils.ts:getMostRecentSessionForRoutine]`, `[hevy-import-utils.ts:buildRoutineExerciseRows]`, `[hevy-import-utils.ts:formatLogType]` — Pure parsing, normalization, inference, and row-building utilities.
- `[hevy-import-types.ts:ExistingExercise]`, `[hevy-import-types.ts:Props]`, `[hevy-import-types.ts:HevyRow]`, `[hevy-import-types.ts:HevySession]`, `[hevy-import-types.ts:ExerciseHistorySession]`, `[hevy-import-types.ts:ExercisePreview]`, `[hevy-import-types.ts:PreviewData]`, `[hevy-import-types.ts:ImportProgressState]`, `[hevy-import-types.ts:ImportResult]`, `[hevy-import-types.ts:ParseCsvResult]`, `[hevy-import-types.ts:ImportPhase]` — Shared TypeScript types.

## Invariants

- `[hevy-import-utils.ts:parseCSV]` — Strips leading UTF-8 BOM (`\uFEFF`), validates 11 required Hevy CSV headers (`title`, `start_time`, `end_time`, `exercise_title`, `superset_id`, `exercise_notes`, `set_index`, `set_type`, `weight_lbs`, `reps`, `duration_seconds`), and skips rows missing `title`, `start_time`, or `exercise_title` while aggregating warning counts.
- `[hevy-import-utils.ts:normalizeName]` — Strips parenthesized equipment qualifiers (e.g., `(Barbell)`, `(Dumbbell)`), replaces hyphens with spaces, lowercases, and collapses whitespace so Hevy titles match existing catalog exercises.
- `[hevy-import-utils.ts:parseHevyDate]` — Requires Hevy date format `"d MMM yyyy, HH:mm"` and throws on invalid dates.
- `[hevy-import-utils.ts:buildRoutineExerciseRows]` — Assigns a shared `crypto.randomUUID()` `superset_id` only when a Hevy `superset_id` group contains more than one distinct exercise; sorts sets per exercise by `set_index` ascending.
- `[hevy-import-client.tsx:HevyImportClient]` — Creates exercises and routines before importing sessions so `workout_sessions.routine_id` can be linked immediately. Duplicate sessions (conflict on `user_id,started_at`) are skipped if they already have sets, repaired if they have 0 sets, and backfilled with `routine_id` when null. If `workout_sets` insert fails for a newly inserted session, the session is deleted (rolled back). If `routine_exercises` insert fails for a newly created routine, the routine is deleted (rolled back).
- `[use-hevy-import-exercise-state.ts:useHevyImportExerciseState]` — Excluding an exercise clears any pending remap or active inline edit for that exercise.

## Side Effects

- `[hevy-import-client.tsx:HevyImportClient]` — Reads uploaded file text via `File.text()` and resets the `<input type="file">` value on `resetImport`.
- `[hevy-import-client.tsx:HevyImportClient]` — Mutates Supabase tables: `exercises` (`insert`), `routines` (`select`, `insert`, `delete` on rollback), `routine_exercises` (`insert`), `workout_sessions` (`upsert`, `select`, `update`, `delete` on rollback), and `workout_sets` (`select` count, `insert`).
- `[hevy-import-client.tsx:HevyImportClient]` — Emits `toast.error` / `toast.success` notifications and `console.warn` logs on partial failures/rollbacks.
- `[hevy-import-utils.ts:buildRoutineExerciseRows]` — Calls `crypto.randomUUID()` when generating superset IDs.

## Verification

```bash
npm run lint && npm run build
```
