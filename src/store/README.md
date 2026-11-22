# store

Client-side Zustand state store for managing an active workout session, including exercises, sets, personal record detection, weight unit conversion, superset grouping, workout pause tracking, and rest timer state.

## Interface

### Store Hook
- `useWorkoutStore` `[workout-store.ts:useWorkoutStore]` — Persisted Zustand store hook (`name: "active-workout"`, `version: 2`) exposing state and actions:
  - **State**:
    - `activeWorkout: ActiveWorkout | null` — Current workout session (`null` when idle).
    - `defaultWeightUnit: WeightUnit` — Preferred unit (`"lbs"` by default).
    - `restTimer: RestTimerState` — Countdown timer metadata (`active`, `paused`, `seconds`, `exerciseId`, `endsAt`).
    - `newPr: { exerciseName: string; value: string } | null` — Most recently triggered personal record notification.
    - `workoutPaused: boolean`, `totalPausedMs: number`, `pausedAt: number | null` — Workout pause state and accumulated pause duration.
  - **Workout lifecycle actions**: `startWorkout(workout)`, `endWorkout()`, `pauseWorkout()`, `resumeWorkout()`, `setSessionId(id)`.
  - **Exercise actions**: `addExercise(exercise)`, `removeExercise(exerciseId)`, `reorderExercises(orderedIds)`, `setExerciseRestTime(exerciseId, seconds)`, `setExerciseNotes(exerciseId, notes)`, `linkSuperset(exerciseId1, exerciseId2)`, `unlinkSuperset(exerciseId)`.
  - **Set actions**: `addSet(exerciseId)`, `removeSet(exerciseId, setId)`, `updateSet(exerciseId, setId, updates)`, `toggleSetComplete(exerciseId, setId): boolean`.
  - **Unit actions**: `setDefaultWeightUnit(unit)`, `convertWeightUnit(unit)`.
  - **Timer & PR actions**: `startRestTimer(exerciseId, seconds?)`, `pauseRestTimer()`, `stopRestTimer()`, `clearPr()`.

### Exported Types
- `ActiveSet` `[workout-store.ts:ActiveSet]` — Individual set record (`id`, `setNumber`, `reps`, `weight`, `weightUnit`, `isBodyweight`, `durationSeconds`, `completed`).
- `ActiveExercise` `[workout-store.ts:ActiveExercise]` — Exercise entry within an active workout (`exerciseId`, `exerciseName`, `gifUrl`, `logType`, `supersetId`, `restSeconds`, `notes`, `bestWeight`, `bestReps`, `bestDuration`, `sets`).
- `ActiveWorkout` `[workout-store.ts:ActiveWorkout]` — Active workout session container (`sessionId`, `name`, `routineId`, `startedAt`, `exercises`).
- `RestTimerState` `[workout-store.ts:RestTimerState]` — Rest timer state shape (`active`, `paused`, `seconds`, `exerciseId`, `endsAt`).

## Invariants

- **Set completion validation** `[workout-store.ts:isSetValid]`, `[workout-store.ts:toggleSetComplete]`: Transitioning a set to `completed: true` returns `false` without mutating state unless the set satisfies its exercise `logType` requirements (`weight >= 0` and `reps > 0` for `weight_reps` / `weighted_bodyweight`; `reps > 0` for `bodyweight_reps` / `assisted_bodyweight`; `durationSeconds > 0` for `duration`).
- **Sequential 1-based set numbering** `[workout-store.ts:addSet]`, `[workout-store.ts:removeSet]`: Appending a set assigns `setNumber = sets.length + 1` (inheriting values from the previous set with `completed: false`); removing a set renumbers remaining sets contiguously from `1`.
- **Monotonic PR updates** `[workout-store.ts:toggleSetComplete]`: Completing a set updates `bestWeight`, `bestReps`, or `bestDuration` and sets `newPr` only when the prior best is `null` or strictly beaten (`>`). Uncompleting a set does not revert `best*` or `newPr`.
- **Idempotent pause/resume accumulation** `[workout-store.ts:pauseWorkout]`, `[workout-store.ts:resumeWorkout]`: `pauseWorkout` is a no-op if already paused; `resumeWorkout` is a no-op if not paused and adds `Date.now() - pausedAt` to `totalPausedMs` while clearing `pausedAt`.
- **Rest timer bounds and pause toggling** `[workout-store.ts:startRestTimer]`, `[workout-store.ts:pauseRestTimer]`, `[workout-store.ts:getRemainingSeconds]`: `startRestTimer` only activates when `seconds > 0` (default `90`); `pauseRestTimer` is a no-op when inactive and toggles between storing frozen remaining `seconds` (`endsAt: null`) and scheduling a new `endsAt`.
- **Superset merge and dissolution** `[workout-store.ts:linkSuperset]`, `[workout-store.ts:unlinkSuperset]`: Linking two exercises merges their existing superset groups under one `supersetId`. Unlinking an exercise from a superset of 2 or fewer exercises clears `supersetId` on all members so single-exercise supersets cannot remain.
- **Session reset preservation** `[workout-store.ts:endWorkout]`: Ending a workout resets `activeWorkout`, `restTimer`, `newPr`, `workoutPaused`, `totalPausedMs`, and `pausedAt`, while preserving `defaultWeightUnit`.
- **Persistence migration (v2)** `[workout-store.ts:useWorkoutStore]`: Hydrated state migration defaults `workoutPaused` to `false` and `totalPausedMs` to `0`, and clears `pausedAt` to `null` whenever `workoutPaused` is `false`.

## Side Effects

- **`localStorage` persistence** `[workout-store.ts:useWorkoutStore]`: Zustand `persist` middleware reads from and writes serialized store state to browser `localStorage` under key `"active-workout"` (version `2`).
- **System clock reads** `[workout-store.ts:pauseWorkout]`, `[workout-store.ts:resumeWorkout]`, `[workout-store.ts:startRestTimer]`, `[workout-store.ts:pauseRestTimer]`, `[workout-store.ts:getRemainingSeconds]`: Calls `Date.now()` to compute pause durations and rest timer expiration timestamps.
- **Random ID generation** `[workout-store.ts:makeSetId]`, `[workout-store.ts:linkSuperset]`: Uses `Math.random().toString(36).slice(2)` to generate set IDs and new superset IDs.
- **Automatic rest timer trigger** `[workout-store.ts:toggleSetComplete]`: Completing a set automatically invokes `startRestTimer(exerciseId, exercise.restSeconds)` when `exercise.restSeconds > 0`.

## Verification

```bash
npm run lint && npm run build
```
