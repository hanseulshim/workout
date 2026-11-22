# types

TypeScript domain enums, Supabase `public` database schema definitions, and row-level entity type aliases for the workout application.

## Interface

- `Json` (`[database.ts:Json]`): Recursive JSON value union (`string | number | boolean | null | { [key: string]: Json | undefined } | Json[]`).
- `WeightUnit` (`[database.ts:WeightUnit]`): `"kg" | "lbs"`.
- `ExerciseCategory` (`[database.ts:ExerciseCategory]`): `"strength" | "cardio" | "bodyweight" | "stretching" | "other"`.
- `MuscleGroup` (`[database.ts:MuscleGroup]`): `"chest" | "back" | "shoulders" | "biceps" | "triceps" | "forearms" | "core" | "glutes" | "quads" | "hamstrings" | "calves" | "full_body" | "other"`.
- `EquipmentType` (`[database.ts:EquipmentType]`): `"barbell" | "dumbbell" | "bodyweight" | "machine" | "cable" | "ez_bar" | "kettlebell" | "band" | "plate" | "other"`.
- `LogType` (`[database.ts:LogType]`): `"weight_reps" | "bodyweight_reps" | "weighted_bodyweight" | "assisted_bodyweight" | "duration"`.
- `Database` (`[database.ts:Database]`): Supabase schema interface defining `public.Tables` (`exercises`, `routines`, `routine_exercises`, `workout_sessions`, `workout_sets` — each with `Row`, `Insert`, and `Update`), `public.Views`, `public.Functions`, and `public.Enums` (`weight_unit`, `exercise_category`, `muscle_group`, `equipment_type`, `log_type`).
- `Exercise` (`[database.ts:Exercise]`): Alias for `Database["public"]["Tables"]["exercises"]["Row"]`.
- `Routine` (`[database.ts:Routine]`): Alias for `Database["public"]["Tables"]["routines"]["Row"]`.
- `RoutineExercise` (`[database.ts:RoutineExercise]`): Alias for `Database["public"]["Tables"]["routine_exercises"]["Row"]`.
- `WorkoutSession` (`[database.ts:WorkoutSession]`): Alias for `Database["public"]["Tables"]["workout_sessions"]["Row"]`.
- `WorkoutSet` (`[database.ts:WorkoutSet]`): Alias for `Database["public"]["Tables"]["workout_sets"]["Row"]`.

## Invariants

- Domain enums (`[database.ts:WeightUnit]`, `[database.ts:ExerciseCategory]`, `[database.ts:MuscleGroup]`, `[database.ts:EquipmentType]`, `[database.ts:LogType]`) are closed string-literal unions mirrored 1:1 in `Database["public"]["Enums"]` (`[database.ts:Database]`).
- Every table's `Update` shape in `Database["public"]["Tables"]` is `Partial<Insert>`, restricting updates to insertable columns (`[database.ts:Database]`).
- `Database["public"]["Views"]` is typed as `Record<string, never>`, while `Database["public"]["Functions"]` declares `get_user_exercises` and `get_user_last_sets` (`[database.ts:Database]`).
- Entity row aliases (`[database.ts:Exercise]`, `[database.ts:Routine]`, `[database.ts:RoutineExercise]`, `[database.ts:WorkoutSession]`, `[database.ts:WorkoutSet]`) are indexed directly from `Database["public"]["Tables"][...]["Row"]` so row types cannot drift from the table schema.
- `Insert` payloads enforce required columns per table: `exercises` (`name`, `muscle_group`, `category`), `routines` (`user_id`, `name`), `routine_exercises` (`routine_id`, `exercise_id`, `position`; each `set_targets` entry requires `reps: string` with optional `weight?: string`), `workout_sessions` (`user_id`, `name`), and `workout_sets` (`session_id`, `exercise_id`, `set_number`) (`[database.ts:Database]`).

## Side Effects

None

## Verification

```bash
npm run lint && npm run build
```
