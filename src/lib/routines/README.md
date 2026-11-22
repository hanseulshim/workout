# routines

Routine serialization and JSON file export utilities for converting routine exercise rows into a portable JSON structure and triggering client-side downloads.

## Interface

- `RoutineExerciseRowLike` `[export-routine.ts:RoutineExerciseRowLike]` — Input row type combining `Partial<RoutineExerciseRow>` with required routine exercise fields (`position`, `default_sets`, `default_reps`, `set_targets`, `notes`, `rest_seconds`, `exercises`, and optional `exercise_id`).
- `exportRoutineToJSON(routineName, days, exercises, routineId?)` `[export-routine.ts:exportRoutineToJSON]` — Converts routine metadata and exercise rows into an `ExportedRoutine` object (`routine_id?`, `name`, `days?`, `exercises`).
- `downloadJSON(data, filename)` `[export-routine.ts:downloadJSON]` — Pretty-prints `data` as 2-space-indented JSON and initiates a browser file download with the given `filename`.

## Invariants

- Day indices outside `0..6` are discarded; valid indices map to lowercase weekday names (`"sunday"`–`"saturday"`), and `days` is omitted when empty `[export-routine.ts:exportRoutineToJSON]`.
- Exercises are sorted ascending by `position` without mutating the input array, and rows with a nullish `exercises` relation are omitted `[export-routine.ts:exportRoutineToJSON]`.
- When `set_targets` is non-empty, each target emits a set with `duration` (if `log_type === "duration"`) or `reps` and optional `weight`; otherwise `default_sets || 1` sets are generated from `default_reps` `[export-routine.ts:exportRoutineToJSON]`.
- Optional metadata fields `routine_id`, `exercise_id`, and `notes` are omitted when falsy, whereas `rest_seconds` and `superset_id` are omitted only when nullish (`!= null`, preserving `0` and `""`) `[export-routine.ts:exportRoutineToJSON]`.

## Side Effects

- Mutates the browser DOM by creating, appending, clicking, and removing a temporary `<a>` element, and allocates/revokes an object URL via `URL.createObjectURL` and `URL.revokeObjectURL` `[export-routine.ts:downloadJSON]`.

## Verification

```bash
npm run lint && npm run build
```
