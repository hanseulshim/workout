# exercises

Interactive exercise library component supporting search, muscle-group filtering, recent/custom grouping, multi-selection, and custom exercise CRUD.

## Interface

- `[exercise-list.tsx:ExerciseList]` — Client component accepting `{ exercises: Exercise[]; userId: string; onSelect?: (exercises: Exercise[]) => void; selectable?: boolean }`. Provides browse and multi-select modes plus inline `detail`, `add`, and `edit` sub-views.

## Invariants

- `[exercise-list.tsx:ExerciseList]` — Uses a single-view state machine (`"list" | "add" | "detail" | "edit"`) with no nested dialogs; returning to `"list"` (`goBack`) clears `detailExercise` and `confirmDelete`.
- `[exercise-list.tsx:ExerciseList]` — Edit and delete actions are only exposed when `ex.is_custom` is `true`; `log_type` is locked (immutable) in the `edit` view.
- `[exercise-list.tsx:ExerciseList]` — Recent exercises are capped at the 10 most recently logged distinct `exercise_id`s from up to the latest 200 `workout_sets`. Sectioned grouping (`Recent`, `My Exercises`, `All Exercises`) is replaced by a flat list whenever a search query or non-`"all"` muscle filter is active.
- `[exercise-list.tsx:ExerciseList]` — Local `exercises` state is re-sorted alphabetically (`localeCompare`) after every insert or update.

## Side Effects

- `[exercise-list.tsx:ExerciseList]` — Queries Supabase `workout_sessions` (by `user_id`) and `workout_sets` (ordered by `completed_at` descending, limit 200) in `useEffect` when `userId` is present.
- `[exercise-list.tsx:ExerciseList]` — Performs Supabase mutations against `exercises`: `insert` (`handleAddExercise`), `update` (`handleUpdateExercise`), and `delete` (`handleDeleteExercise`).
- `[exercise-list.tsx:ExerciseList]` — Displays `toast.success` / `toast.error` notifications for create, update, and delete operations.

## Verification

```bash
npm run lint && npm run build
```
