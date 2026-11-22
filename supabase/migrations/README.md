# migrations

Ordered PostgreSQL/Supabase schema migrations (`001_initial_schema.sql` through `011_harden_progress_rpcs_and_drop_dup_index.sql`) defining the relational data model, enums, indexes, Row Level Security (RLS) policies, seed exercise library, and progress-reporting RPC functions for the workout tracker.

## Interface

### Extensions & Enums

- **`pgcrypto`** (`[001_initial_schema.sql:pgcrypto]`): Enabled via `create extension if not exists "pgcrypto"` for `gen_random_uuid()`.
- **`weight_unit`** (`[001_initial_schema.sql:weight_unit]`): Enum `('kg', 'lbs')`.
- **`exercise_category`** (`[001_initial_schema.sql:exercise_category]`): Enum `('strength', 'cardio', 'bodyweight', 'stretching', 'other')`.
- **`muscle_group`** (`[001_initial_schema.sql:muscle_group]`): Enum `('chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'core', 'glutes', 'quads', 'hamstrings', 'calves', 'full_body', 'other')`.
- **`equipment_type`** (`[002_equipment_log_type.sql:equipment_type]`): Enum `('barbell', 'dumbbell', 'bodyweight', 'machine', 'cable', 'ez_bar', 'kettlebell', 'band', 'plate', 'other')`.
- **`log_type`** (`[002_equipment_log_type.sql:log_type]`): Enum `('weight_reps', 'bodyweight_reps', 'weighted_bodyweight', 'assisted_bodyweight', 'duration')`.

### Tables, Columns & Constraints

- **`exercises`** (`[001_initial_schema.sql:exercises]`, `[002_equipment_log_type.sql:exercises]`, `[003_gif_urls.sql:exercises]`): Global seeded exercises and user-defined custom exercises.
  - `id uuid primary key default gen_random_uuid()` (`[001_initial_schema.sql:exercises]`)
  - `name text not null` (`[001_initial_schema.sql:exercises]`)
  - `muscle_group muscle_group not null default 'other'` (`[001_initial_schema.sql:exercises]`)
  - `category exercise_category not null default 'strength'` (`[001_initial_schema.sql:exercises]`)
  - `is_custom boolean not null default false` (`[001_initial_schema.sql:exercises]`)
  - `user_id uuid references auth.users(id) on delete cascade` (`[001_initial_schema.sql:exercises]`)
  - `created_at timestamptz not null default now()` (`[001_initial_schema.sql:exercises]`)
  - `equipment_type equipment_type not null default 'other'` (`[002_equipment_log_type.sql:exercises]`)
  - `log_type log_type not null default 'weight_reps'` (`[002_equipment_log_type.sql:exercises]`)
  - `gif_url text` (`[003_gif_urls.sql:exercises]`)

- **`routines`** (`[001_initial_schema.sql:routines]`, `[008_routine_last_used.sql:routines]`, `[010_routine_days.sql:routines]`): User workout routine templates.
  - `id uuid primary key default gen_random_uuid()` (`[001_initial_schema.sql:routines]`)
  - `user_id uuid not null references auth.users(id) on delete cascade` (`[001_initial_schema.sql:routines]`)
  - `name text not null` (`[001_initial_schema.sql:routines]`)
  - `created_at timestamptz not null default now()` (`[001_initial_schema.sql:routines]`)
  - `updated_at timestamptz not null default now()` (`[001_initial_schema.sql:routines]`)
  - `last_used_at timestamptz` (`[008_routine_last_used.sql:routines]`)
  - `days int2[] not null default '{}'` (`[010_routine_days.sql:routines]`): Scheduled weekdays (`0=Sun` through `6=Sat`).

- **`routine_exercises`** (`[001_initial_schema.sql:routine_exercises]`, `[004_per_set_targets.sql:routine_exercises]`, `[005_exercise_notes.sql:routine_exercises]`, `[008_routine_last_used.sql:routine_exercises]`): Ordered exercise entries within a routine.
  - `id uuid primary key default gen_random_uuid()` (`[001_initial_schema.sql:routine_exercises]`)
  - `routine_id uuid not null references routines(id) on delete cascade` (`[001_initial_schema.sql:routine_exercises]`)
  - `exercise_id uuid not null references exercises(id) on delete cascade` (`[001_initial_schema.sql:routine_exercises]`)
  - `position integer not null default 0` (`[001_initial_schema.sql:routine_exercises]`)
  - `default_sets integer not null default 3` (`[001_initial_schema.sql:routine_exercises]`)
  - `default_reps integer` (`[001_initial_schema.sql:routine_exercises]`)
  - `default_weight numeric` (`[001_initial_schema.sql:routine_exercises]`)
  - `set_targets jsonb` (`[004_per_set_targets.sql:routine_exercises]`): Optional array of per-set targets `[{"reps": string}]`; when non-null, its length overrides `default_sets`.
  - `superset_id text` (`[004_per_set_targets.sql:routine_exercises]`): Shared identifier grouping exercises into a superset within a routine.
  - `notes text` (`[005_exercise_notes.sql:routine_exercises]`)
  - `rest_seconds integer` (`[008_routine_last_used.sql:routine_exercises]`)

- **`workout_sessions`** (`[001_initial_schema.sql:workout_sessions]`, `[006_unique_session.sql:workout_sessions_user_started_unique]`): Logged workout sessions.
  - `id uuid primary key default gen_random_uuid()` (`[001_initial_schema.sql:workout_sessions]`)
  - `user_id uuid not null references auth.users(id) on delete cascade` (`[001_initial_schema.sql:workout_sessions]`)
  - `routine_id uuid references routines(id) on delete set null` (`[001_initial_schema.sql:workout_sessions]`)
  - `name text not null` (`[001_initial_schema.sql:workout_sessions]`)
  - `started_at timestamptz not null default now()` (`[001_initial_schema.sql:workout_sessions]`)
  - `finished_at timestamptz` (`[001_initial_schema.sql:workout_sessions]`)
  - `notes text` (`[001_initial_schema.sql:workout_sessions]`)
  - Constraint `workout_sessions_user_started_unique UNIQUE (user_id, started_at)` (`[006_unique_session.sql:workout_sessions_user_started_unique]`).

- **`workout_sets`** (`[001_initial_schema.sql:workout_sets]`): Individual sets recorded during a session.
  - `id uuid primary key default gen_random_uuid()` (`[001_initial_schema.sql:workout_sets]`)
  - `session_id uuid not null references workout_sessions(id) on delete cascade` (`[001_initial_schema.sql:workout_sets]`)
  - `exercise_id uuid not null references exercises(id) on delete cascade` (`[001_initial_schema.sql:workout_sets]`)
  - `set_number integer not null` (`[001_initial_schema.sql:workout_sets]`)
  - `reps integer` (`[001_initial_schema.sql:workout_sets]`)
  - `weight numeric` (`[001_initial_schema.sql:workout_sets]`)
  - `weight_unit weight_unit not null default 'lbs'` (`[001_initial_schema.sql:workout_sets]`)
  - `is_bodyweight boolean not null default false` (`[001_initial_schema.sql:workout_sets]`)
  - `duration_seconds integer` (`[001_initial_schema.sql:workout_sets]`)
  - `rest_seconds integer` (`[001_initial_schema.sql:workout_sets]`)
  - `completed_at timestamptz not null default now()` (`[001_initial_schema.sql:workout_sets]`)

### Indexes

- `exercises_user_id_idx` on `exercises(user_id)` (`[001_initial_schema.sql:exercises_user_id_idx]`)
- `exercises_muscle_group_idx` on `exercises(muscle_group)` (`[001_initial_schema.sql:exercises_muscle_group_idx]`)
- `routines_user_id_idx` on `routines(user_id)` (`[001_initial_schema.sql:routines_user_id_idx]`)
- `idx_routines_user_last_used` on `routines(user_id, last_used_at DESC)` (`[008_routine_last_used.sql:idx_routines_user_last_used]`)
- `routine_exercises_routine_id_idx` on `routine_exercises(routine_id)` (`[001_initial_schema.sql:routine_exercises_routine_id_idx]`)
- `workout_sessions_user_id_idx` on `workout_sessions(user_id)` (`[001_initial_schema.sql:workout_sessions_user_id_idx]`)
- `workout_sessions_started_at_idx` on `workout_sessions(started_at desc)` (`[001_initial_schema.sql:workout_sessions_started_at_idx]`)
- `idx_workout_sessions_user_finished` on `workout_sessions(user_id, finished_at DESC)` (`[007_composite_indexes.sql:idx_workout_sessions_user_finished]`)
- `idx_workout_sessions_user_routine_finished` on `workout_sessions(user_id, routine_id, finished_at DESC)` (`[007_composite_indexes.sql:idx_workout_sessions_user_routine_finished]`)
- `workout_sets_session_id_idx` on `workout_sets(session_id)` (`[001_initial_schema.sql:workout_sets_session_id_idx]`)
- `idx_workout_sets_session` on `workout_sets(session_id)` (`[007_composite_indexes.sql:idx_workout_sets_session]`)
- `workout_sets_exercise_id_idx` on `workout_sets(exercise_id)` (`[001_initial_schema.sql:workout_sets_exercise_id_idx]`)
- `idx_workout_sets_exercise_completed` on `workout_sets(exercise_id, completed_at DESC)` (`[007_composite_indexes.sql:idx_workout_sets_exercise_completed]`)

### RPC Functions

- **`public.get_user_exercises(p_user_id uuid)`** (`[009_progress_rpc.sql:get_user_exercises]`): `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`. Returns `TABLE (id uuid, name text, muscle_group muscle_group, category exercise_category)` for every distinct exercise (`DISTINCT ON (e.id)`) the user has logged across `workout_sets` joined to `workout_sessions` where `s.user_id = p_user_id`.
- **`public.get_user_last_sets(p_user_id uuid)`** (`[009_progress_rpc.sql:get_user_last_sets]`): `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`. Returns `TABLE (exercise_id uuid, weight numeric, reps integer, duration_seconds integer, weight_unit weight_unit, log_type log_type)` containing the single most recent set per exercise (`DISTINCT ON (ws.exercise_id) ... ORDER BY ws.exercise_id, ws.completed_at DESC`) for `s.user_id = p_user_id`.

### Row Level Security (RLS) Policies

RLS is enabled on all five tables (`[001_initial_schema.sql:exercises]`, `[001_initial_schema.sql:routines]`, `[001_initial_schema.sql:routine_exercises]`, `[001_initial_schema.sql:workout_sessions]`, `[001_initial_schema.sql:workout_sets]`):

- **`exercises`**:
  - `"Read global exercises"` (`SELECT`): `is_custom = false or user_id = auth.uid()` (`[001_initial_schema.sql:Read global exercises]`)
  - `"Insert custom exercise"` (`INSERT`): `is_custom = true and user_id = auth.uid()` (`[001_initial_schema.sql:Insert custom exercise]`)
  - `"Update own custom exercise"` (`UPDATE`): `user_id = auth.uid()` (`[001_initial_schema.sql:Update own custom exercise]`)
  - `"Delete own custom exercise"` (`DELETE`): `user_id = auth.uid()` (`[001_initial_schema.sql:Delete own custom exercise]`)
- **`routines`**:
  - `"Routines: own rows"` (`ALL`): `user_id = auth.uid()` for both `USING` and `WITH CHECK` (`[001_initial_schema.sql:Routines: own rows]`)
- **`routine_exercises`**:
  - `"Routine exercises: own via routine"` (`ALL`): `exists (select 1 from routines r where r.id = routine_id and r.user_id = auth.uid())` for both `USING` and `WITH CHECK` (`[001_initial_schema.sql:Routine exercises: own via routine]`)
- **`workout_sessions`**:
  - `"Sessions: own rows"` (`ALL`): `user_id = auth.uid()` for both `USING` and `WITH CHECK` (`[001_initial_schema.sql:Sessions: own rows]`)
- **`workout_sets`**:
  - `"Sets: own via session"` (`ALL`): `exists (select 1 from workout_sessions ws where ws.id = session_id and ws.user_id = auth.uid())` for both `USING` and `WITH CHECK` (`[001_initial_schema.sql:Sets: own via session]`)

### Triggers

- None. No database triggers are defined in `supabase/migrations`; columns such as `routines.updated_at` (`[001_initial_schema.sql:routines]`) and `routines.last_used_at` (`[008_routine_last_used.sql:routines]`) must be updated by application code after initial creation/backfill.

## Invariants

- **Sequential migration dependency**: Migrations must be applied in strict numeric order `001` through `010`; `002` and `003` update rows seeded by `001`, `008` backfills `routines.last_used_at` from `workout_sessions`, and `009` references `log_type` added in `002`.
- **Ownership & cascading deletes**: Deleting an `auth.users` row cascades to `exercises` (custom), `routines`, and `workout_sessions`; deleting a `routines` row cascades to `routine_exercises` and sets `workout_sessions.routine_id` to `NULL`; deleting a `workout_sessions` row cascades to `workout_sets`; deleting an `exercises` row cascades to `routine_exercises` and `workout_sets` (`[001_initial_schema.sql:exercises]`, `[001_initial_schema.sql:routines]`, `[001_initial_schema.sql:routine_exercises]`, `[001_initial_schema.sql:workout_sessions]`, `[001_initial_schema.sql:workout_sets]`).
- **Session deduplication**: A single user cannot have two `workout_sessions` rows with the exact same `started_at` timestamp (`[006_unique_session.sql:workout_sessions_user_started_unique]`).
- **Per-set target fallback**: When `routine_exercises.set_targets` is `NULL`, callers fall back to `default_sets` and `default_reps`; when non-null, `jsonb` array length overrides `default_sets` (`[004_per_set_targets.sql:routine_exercises]`).
- **RPC `SECURITY DEFINER` ownership enforcement**: Both `public.get_user_exercises` and `public.get_user_last_sets` run as `SECURITY DEFINER` with `search_path = public` and enforce `s.user_id = auth.uid() and s.user_id = p_user_id` (`[011_harden_progress_rpcs_and_drop_dup_index.sql:get_user_exercises]`, `[011_harden_progress_rpcs_and_drop_dup_index.sql:get_user_last_sets]`).
- **Redundant index removed**: `idx_workout_sets_session` (created in `007`) is dropped by `011_harden_progress_rpcs_and_drop_dup_index.sql`, leaving `workout_sets_session_id_idx` (`[001_initial_schema.sql:workout_sets_session_id_idx]`).

## Side Effects

- **Global exercise library seed (`001`)**: Inserts 96 global exercises (`is_custom = false`) across chest (11), back (12), shoulders (9), biceps (8), triceps (7), forearms (3), core (10), glutes (4), quads (10), hamstrings (4), calves (3), cardio (7), and full-body compound (8) (`[001_initial_schema.sql:exercises]`).
- **Equipment and log type backfill (`002`)**: Executes 11 `UPDATE` statements classifying the seeded exercises by `equipment_type` and `log_type` (`[002_equipment_log_type.sql:exercises]`).
- **Exercise GIF URL backfill (`003`)**: Executes 88 `UPDATE` statements populating `exercises.gif_url` with `https://static.exercisedb.dev/media/*.gif` URLs for matching global exercises (`is_custom = false`) (`[003_gif_urls.sql:exercises]`).
- **Routine `last_used_at` backfill (`008`)**: Updates existing `routines` rows with `MAX(workout_sessions.finished_at)` grouped by `routine_id` where `routine_id IS NOT NULL` (`[008_routine_last_used.sql:routines]`).

## Verification

Repository-level verification command:

```bash
npm run lint && npm run build
```

Note: These SQL files are not executed by `npm run lint` or `npm run build`; schema validation requires applying the migrations in order against a PostgreSQL/Supabase instance (e.g., via Supabase CLI).
