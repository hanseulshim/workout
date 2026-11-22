# routines

Routine authoring, scheduling, JSON import/export, deletion, volume visualization, and routine-linked session history components.

## Interface

- `[routine-builder.tsx:RoutineBuilder]` — Drag-and-drop routine editor (`@dnd-kit`) for creating or updating a routine (`name`, weekday `days`, ordered `selected` exercises with sets, supersets, notes, and rest presets).
- `[routine-builder-exercise-groups.tsx:RoutineBuilderExerciseGroups]` — Groups selected exercises into standalone cards and multi-exercise `SupersetGroup` blocks with `SupersetLinkButton` connectors.
- `[routine-exercise-card.tsx:RoutineExerciseCard]` — Wraps `ExerciseEditorCard` with set target inputs, add/remove set controls, rest timer presets (`0`, `30`, `60`, `90`, `120`, `180` seconds), and `WorkoutNotesInput`.
- `[routine-exercise-set-targets.tsx:RoutineExerciseSetTargets]` — Renders per-set target inputs (`Weight`/`+Weight`/`Assist` and `Reps`/`Secs`) adapted to `ex.logType`.
- `[routine-exercise-picker-sheet.tsx:RoutineExercisePickerSheet]` — Bottom `Sheet` hosting `ExerciseList` in `selectable` mode to add exercises to a routine.
- `[routine-builder-save.ts:saveRoutine]` — Async persistence helper that creates or updates a routine and its `routine_exercises` rows in Supabase.
- `[routine-builder-types.ts:SetTarget]`, `[routine-builder-types.ts:RoutineExerciseRow]`, `[routine-builder-types.ts:ExistingRoutine]`, `[routine-builder-types.ts:SelectedExercise]` — Shared routine builder types.
- `[json-routine-importer.tsx:JsonRoutineImporter]` — Pastes and parses routine JSON, resolves exercise names via the caller's `resolveExercises` callback, detects existing routines by `routine_id`, and saves via `saveRoutine`.
- `[routine-export-button.tsx:RoutineExportButton]` — Exports a routine to a downloadable `<slug>-routine.json` file via `exportRoutineToJSON` and `downloadJSON`.
- `[routine-delete-button.tsx:RoutineDeleteButton]` — Confirmation `AlertDialog` button that deletes a routine from Supabase.
- `[routine-list-with-filter.tsx:RoutineListWithFilter]` — Day-of-week filterable routine grid with links to view, edit, and start each routine.
- `[weekly-schedule.tsx:WeeklySchedule]` — 7-day indicator strip (`Sun`–`Sat`) and list of routines scheduled for `new Date().getDay()`.
- `[routine-volume-chart.tsx:RoutineVolumeChart]` — Recharts `LineChart` toggling between `"volume"` (`weightUnit`) and `"reps"` across sessions.
- `[session-history-list.tsx:SessionHistoryList]` — Lists routine sessions with duration or active resume link based on `useWorkoutStore().activeWorkout`.

## Invariants

- `[routine-builder.tsx:RoutineBuilder]` — Rejects saving if `name.trim()` is empty or `selected.length === 0`. Prevents duplicate exercises on add, enforces at least 1 set per exercise (`removeSet` no-ops when `sets.length <= 1`), and dissolves a superset (`supersetId: null` for all members) when unlinking reduces it to fewer than 2 exercises. Resets form state when `routine?.id` changes.
- `[routine-builder-save.ts:saveRoutine]` — Filters out entries without a truthy `exerciseId`. When updating an existing routine, deletes and re-inserts `routine_exercises`; if re-insertion fails, attempts to restore `originalRows` before rethrowing.
- `[routine-builder-exercise-groups.tsx:RoutineBuilderExerciseGroups]` — Treats a `supersetId` with `<= 1` member as a single exercise rather than a superset group.
- `[json-routine-importer.tsx:JsonRoutineImporter]` — Requires parsed JSON to contain a truthy `name` and an `exercises` array; disables save if 0 exercises match the library. Normalizes `days` from numbers or lowercase/short weekday names (`sunday`/`sun`..`saturday`/`sat`).
- `[session-history-list.tsx:SessionHistoryList]` — Links completed sessions to `/history/<id>`, links the currently active in-progress session (matching `activeWorkout?.sessionId`) to `/workout/<id>`, and renders non-active in-progress sessions as unlinked text.

## Side Effects

- `[routine-builder-save.ts:saveRoutine]` — Mutates Supabase `routines` (`insert` or `update`) and `routine_exercises` (`delete`, `insert`, and rollback `insert`). Logs restore errors via `console.error`.
- `[routine-builder.tsx:RoutineBuilder]` — Calls `saveRoutine`, emits `toast.info`/`toast.error`/`toast.success`, and navigates via `router.push`.
- `[json-routine-importer.tsx:JsonRoutineImporter]` — Queries Supabase `routines` when `routine_id` is present, calls `saveRoutine`, writes `AI_PROMPT` to `navigator.clipboard.writeText`, uses `setTimeout` for copy confirmation, emits `toast.error`/`toast.success`, and navigates via `router.push(`/routines/${id}`)`.
- `[routine-delete-button.tsx:RoutineDeleteButton]` — Deletes from Supabase `routines`, emits `toast.error`/`toast.success`, and navigates via `router.push("/routines")`.
- `[routine-export-button.tsx:RoutineExportButton]` — Triggers browser JSON file download via `downloadJSON` and emits `toast.success`/`toast.error`.

## Verification

```bash
npm run lint && npm run build
```
