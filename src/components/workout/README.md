# workout

Active workout logging, session start/resume/hydration, rest timer, drag-and-drop exercise/superset editing, and session persistence components.

## Interface

- `[active-workout-screen.tsx:ActiveWorkoutScreen]` — Main active-workout view (`{ sessionId?: string }`) orchestrating session hydration from Supabase, live elapsed/rest ticking, audio keep-alive/chime, PR toasts, exercise/set editing, pause/resume, finish, and discard flows.
- `[active-workout-header.tsx:ActiveWorkoutHeader]` — Sticky header displaying workout name, elapsed duration (excluding `totalPausedMs`), pause/resume, discard, finish, minimize, and set completion progress bar.
- `[active-workout-rest-timer.tsx:ActiveWorkoutRestTimer]` — Countdown pill with pause/resume, skip, and urgent styling when `!paused && remainingSeconds <= 5 && remainingSeconds > 0`.
- `[active-workout-exercise-groups.tsx:ActiveWorkoutExerciseGroups]` — `@dnd-kit` sortable container grouping `ActiveExercise[]` into standalone cards and `SupersetGroup` blocks with `SupersetLinkButton` connectors.
- `[active-workout-exercise-card.tsx:ActiveWorkoutExerciseCard]` — Exercise card for active logging with per-`LogType` set rows (`duration` with inline stopwatch, `bodyweight_reps`, or weight+reps), rest preset picker (`0`, `30`, `60`, `90`, `120`, `180`s), add/remove set, and notes.
- `[active-workout-banner.tsx:ActiveWorkoutBanner]` — Persistent top banner shown across routes when an active workout exists (hidden on `/workout/<sessionId>`) with resume and discard actions.
- `[active-workout-session-actions.ts:saveActiveWorkout]`, `[active-workout-session-actions.ts:discardActiveWorkout]` — Supabase persistence helpers for finishing a workout (inserting completed sets, updating `finished_at` with retry/rollback, syncing routine defaults/order/deletions) and discarding a session.
- `[workout-start-client.tsx:WorkoutStartClient]` — Workout launcher supporting empty workouts, routine-based workouts (with auto-start for `preselectedRoutine`), active-session conflict resolution, and pre-filling sets from `set_targets`/`lastSets`/`personalBests`.
- `[add-exercise-sheet.tsx:AddExerciseSheet]` — Bottom `Sheet` wrapping `ExerciseList` in `selectable` mode to append exercises mid-workout.
- `[finish-workout-dialog.tsx:FinishWorkoutDialog]` — Confirmation `AlertDialog` showing completed set count before finalizing a workout.
- `[exercise-editor-card.tsx:ExerciseEditorCard]`, `[exercise-editor-card.tsx:SupersetLinkButton]`, `[exercise-editor-card.tsx:SupersetGroup]` — Shared sortable, collapsible exercise card and superset visual wrappers reused by both `workout` and `routines`.
- `[workout-notes-input.tsx:WorkoutNotesInput]` — Auto-resizing textarea for exercise notes.

## Invariants

- `[active-workout-screen.tsx:ActiveWorkoutScreen]` — Hydrates from Supabase only when `sessionId` is provided and does not already match `activeWorkout.sessionId`; if the fetched session is missing or already has `finished_at !== null`, clears local state if matching and stops loading.
- `[active-workout-screen.tsx:ActiveWorkoutScreen]` — Coordinates workout pause with rest timer pause via `restTimerPausedByWorkout`: pausing the workout auto-pauses an active rest timer, and resuming the workout only auto-resumes the rest timer if the user has not manually toggled it (`handleTimerToggle`).
- `[active-workout-header.tsx:ActiveWorkoutHeader]` — Disables the "Finish" button when `finishing` is `true` or `completedSets === 0`.
- `[active-workout-session-actions.ts:saveActiveWorkout]` — Only inserts sets where `setItem.completed === true`. Attempts the `workout_sessions.finished_at` update up to 2 total times (1 initial attempt + 1 retry); if all attempts fail, deletes any newly inserted `workout_sets` rows before rethrowing. When syncing back to `routine_exercises`, only deletes removed exercises if `activeWorkout.exercises.length > 0` to avoid wiping the routine template.
- `[workout-start-client.tsx:WorkoutStartClient]` — Refuses to start a routine with 0 exercises. Checks for unfinished sessions started within the last 24 hours; resumes if it matches `activeWorkout.sessionId`, cleans up orphaned DB sessions when no local `activeWorkout` exists, or prompts via conflict `AlertDialog` when switching away from a different active workout.
- `[active-workout-banner.tsx:ActiveWorkoutBanner]` — Returns `null` when `!activeWorkout` or when already on `/workout/${activeWorkout.sessionId}`.
- `[active-workout-exercise-card.tsx:ActiveWorkoutExerciseCard]` — Only renders the remove-set button when `exercise.sets.length > 1`; duration stopwatch records `Math.max(1, Math.round((nowMs() - startedAt) / 1000))` seconds.

## Side Effects

- `[active-workout-screen.tsx:ActiveWorkoutScreen]` — Queries Supabase `workout_sessions`, `routines`, `workout_sets`, `exercises`, and `supabase.auth.getUser()`; registers global `pointerdown`, `touchstart`, `mousedown`, `keydown`, and `visibilitychange` listeners to unlock Web Audio (`unlockAudio`); runs a 1-second `window.setInterval` calling `keepAudioAlive()` every 10 seconds during active rest; plays `playRestChime()`, triggers `navigator.vibrate([200, 100, 200])`, emits `toast.info`/`toast.success`/`toast.error`, mutates `useWorkoutStore`, and navigates via `router.push`/`router.refresh`.
- `[active-workout-session-actions.ts:saveActiveWorkout]`, `[active-workout-session-actions.ts:discardActiveWorkout]` — Mutates Supabase `workout_sets` (`insert`, rollback `delete`), `workout_sessions` (`update`, `delete`), `routine_exercises` (`select`, `update`, `insert`, `delete`), and `routines` (`update` `last_used_at`).
- `[active-workout-banner.tsx:ActiveWorkoutBanner]` — Deletes from Supabase `workout_sessions`, calls `useWorkoutStore().endWorkout()`, and navigates via `router.push`.
- `[workout-start-client.tsx:WorkoutStartClient]` — Queries/inserts/deletes Supabase `workout_sessions`, mutates `useWorkoutStore` (`startWorkout`, `endWorkout`), emits `toast.error`, and navigates via `router.push`/`router.back`.
- `[workout-notes-input.tsx:WorkoutNotesInput]` — Mutates `textareaRef.current.style.height` in `useEffect` to match `scrollHeight`.

## Verification

```bash
npm run lint && npm run build
```
