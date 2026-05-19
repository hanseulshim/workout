-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Enums
create type weight_unit as enum ('kg', 'lbs');
create type exercise_category as enum ('strength', 'cardio', 'bodyweight', 'stretching', 'other');
create type muscle_group as enum (
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'core', 'glutes', 'quads', 'hamstrings', 'calves', 'full_body', 'other'
);

-- Exercises (global seeded + user custom)
create table exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  muscle_group muscle_group not null default 'other',
  category exercise_category not null default 'strength',
  is_custom boolean not null default false,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index exercises_user_id_idx on exercises(user_id);
create index exercises_muscle_group_idx on exercises(muscle_group);

-- Routines
create table routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index routines_user_id_idx on routines(user_id);

-- Exercises within a routine (template)
create table routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references routines(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  position integer not null default 0,
  default_sets integer not null default 3,
  default_reps integer,
  default_weight numeric
);
create index routine_exercises_routine_id_idx on routine_exercises(routine_id);

-- Workout sessions
create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid references routines(id) on delete set null,
  name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  notes text
);
create index workout_sessions_user_id_idx on workout_sessions(user_id);
create index workout_sessions_started_at_idx on workout_sessions(started_at desc);

-- Individual sets logged during a session
create table workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workout_sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  set_number integer not null,
  reps integer,
  weight numeric,
  weight_unit weight_unit not null default 'lbs',
  is_bodyweight boolean not null default false,
  duration_seconds integer,
  rest_seconds integer,
  completed_at timestamptz not null default now()
);
create index workout_sets_session_id_idx on workout_sets(session_id);
create index workout_sets_exercise_id_idx on workout_sets(exercise_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table exercises enable row level security;
alter table routines enable row level security;
alter table routine_exercises enable row level security;
alter table workout_sessions enable row level security;
alter table workout_sets enable row level security;

-- Exercises: anyone can read global exercises; only owner can read/write their custom ones
create policy "Read global exercises" on exercises
  for select using (is_custom = false or user_id = auth.uid());

create policy "Insert custom exercise" on exercises
  for insert with check (is_custom = true and user_id = auth.uid());

create policy "Update own custom exercise" on exercises
  for update using (user_id = auth.uid());

create policy "Delete own custom exercise" on exercises
  for delete using (user_id = auth.uid());

-- Routines: user owns their routines
create policy "Routines: own rows" on routines
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Routine exercises: accessible via routine ownership
create policy "Routine exercises: own via routine" on routine_exercises
  for all using (
    exists (select 1 from routines r where r.id = routine_id and r.user_id = auth.uid())
  )
  with check (
    exists (select 1 from routines r where r.id = routine_id and r.user_id = auth.uid())
  );

-- Workout sessions: user owns their sessions
create policy "Sessions: own rows" on workout_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Workout sets: accessible via session ownership
create policy "Sets: own via session" on workout_sets
  for all using (
    exists (select 1 from workout_sessions ws where ws.id = session_id and ws.user_id = auth.uid())
  )
  with check (
    exists (select 1 from workout_sessions ws where ws.id = session_id and ws.user_id = auth.uid())
  );

-- ─── Seed: Exercise Library ───────────────────────────────────────────────────

insert into exercises (name, muscle_group, category, is_custom) values
  -- Chest
  ('Bench Press', 'chest', 'strength', false),
  ('Incline Bench Press', 'chest', 'strength', false),
  ('Decline Bench Press', 'chest', 'strength', false),
  ('Dumbbell Chest Press', 'chest', 'strength', false),
  ('Incline Dumbbell Press', 'chest', 'strength', false),
  ('Chest Fly', 'chest', 'strength', false),
  ('Cable Chest Fly', 'chest', 'strength', false),
  ('Push-Up', 'chest', 'bodyweight', false),
  ('Incline Push-Up', 'chest', 'bodyweight', false),
  ('Dips', 'chest', 'bodyweight', false),
  ('Pec Deck', 'chest', 'strength', false),

  -- Back
  ('Deadlift', 'back', 'strength', false),
  ('Romanian Deadlift', 'back', 'strength', false),
  ('Barbell Row', 'back', 'strength', false),
  ('Dumbbell Row', 'back', 'strength', false),
  ('Pull-Up', 'back', 'bodyweight', false),
  ('Chin-Up', 'back', 'bodyweight', false),
  ('Lat Pulldown', 'back', 'strength', false),
  ('Seated Cable Row', 'back', 'strength', false),
  ('T-Bar Row', 'back', 'strength', false),
  ('Face Pull', 'back', 'strength', false),
  ('Good Morning', 'back', 'strength', false),
  ('Back Extension', 'back', 'strength', false),

  -- Shoulders
  ('Overhead Press', 'shoulders', 'strength', false),
  ('Seated Dumbbell Press', 'shoulders', 'strength', false),
  ('Arnold Press', 'shoulders', 'strength', false),
  ('Lateral Raise', 'shoulders', 'strength', false),
  ('Front Raise', 'shoulders', 'strength', false),
  ('Rear Delt Fly', 'shoulders', 'strength', false),
  ('Cable Lateral Raise', 'shoulders', 'strength', false),
  ('Upright Row', 'shoulders', 'strength', false),
  ('Shrugs', 'shoulders', 'strength', false),

  -- Biceps
  ('Barbell Curl', 'biceps', 'strength', false),
  ('Dumbbell Curl', 'biceps', 'strength', false),
  ('Hammer Curl', 'biceps', 'strength', false),
  ('Incline Dumbbell Curl', 'biceps', 'strength', false),
  ('Cable Curl', 'biceps', 'strength', false),
  ('Preacher Curl', 'biceps', 'strength', false),
  ('Concentration Curl', 'biceps', 'strength', false),
  ('EZ Bar Curl', 'biceps', 'strength', false),

  -- Triceps
  ('Tricep Pushdown', 'triceps', 'strength', false),
  ('Overhead Tricep Extension', 'triceps', 'strength', false),
  ('Skull Crusher', 'triceps', 'strength', false),
  ('Close-Grip Bench Press', 'triceps', 'strength', false),
  ('Tricep Dips', 'triceps', 'bodyweight', false),
  ('Kickbacks', 'triceps', 'strength', false),
  ('Diamond Push-Up', 'triceps', 'bodyweight', false),

  -- Forearms
  ('Wrist Curl', 'forearms', 'strength', false),
  ('Reverse Wrist Curl', 'forearms', 'strength', false),
  ('Farmers Walk', 'forearms', 'strength', false),

  -- Core
  ('Plank', 'core', 'bodyweight', false),
  ('Crunches', 'core', 'bodyweight', false),
  ('Bicycle Crunch', 'core', 'bodyweight', false),
  ('Leg Raise', 'core', 'bodyweight', false),
  ('Russian Twist', 'core', 'bodyweight', false),
  ('Ab Wheel Rollout', 'core', 'strength', false),
  ('Cable Crunch', 'core', 'strength', false),
  ('Hanging Leg Raise', 'core', 'bodyweight', false),
  ('Side Plank', 'core', 'bodyweight', false),
  ('Woodchop', 'core', 'strength', false),

  -- Glutes
  ('Hip Thrust', 'glutes', 'strength', false),
  ('Glute Bridge', 'glutes', 'bodyweight', false),
  ('Cable Kickback', 'glutes', 'strength', false),
  ('Donkey Kick', 'glutes', 'bodyweight', false),

  -- Quads
  ('Squat', 'quads', 'strength', false),
  ('Front Squat', 'quads', 'strength', false),
  ('Goblet Squat', 'quads', 'strength', false),
  ('Hack Squat', 'quads', 'strength', false),
  ('Leg Press', 'quads', 'strength', false),
  ('Leg Extension', 'quads', 'strength', false),
  ('Bulgarian Split Squat', 'quads', 'strength', false),
  ('Lunge', 'quads', 'strength', false),
  ('Walking Lunge', 'quads', 'strength', false),
  ('Step-Up', 'quads', 'strength', false),

  -- Hamstrings
  ('Leg Curl', 'hamstrings', 'strength', false),
  ('Seated Leg Curl', 'hamstrings', 'strength', false),
  ('Nordic Curl', 'hamstrings', 'bodyweight', false),
  ('Stiff-Leg Deadlift', 'hamstrings', 'strength', false),

  -- Calves
  ('Standing Calf Raise', 'calves', 'strength', false),
  ('Seated Calf Raise', 'calves', 'strength', false),
  ('Donkey Calf Raise', 'calves', 'strength', false),

  -- Cardio
  ('Running', 'full_body', 'cardio', false),
  ('Cycling', 'full_body', 'cardio', false),
  ('Rowing Machine', 'full_body', 'cardio', false),
  ('Jump Rope', 'full_body', 'cardio', false),
  ('Stair Climber', 'full_body', 'cardio', false),
  ('Elliptical', 'full_body', 'cardio', false),
  ('Swimming', 'full_body', 'cardio', false),

  -- Full Body / Compound
  ('Power Clean', 'full_body', 'strength', false),
  ('Clean and Jerk', 'full_body', 'strength', false),
  ('Snatch', 'full_body', 'strength', false),
  ('Thruster', 'full_body', 'strength', false),
  ('Burpee', 'full_body', 'bodyweight', false),
  ('Box Jump', 'full_body', 'bodyweight', false),
  ('Kettlebell Swing', 'full_body', 'strength', false),
  ('Turkish Get-Up', 'full_body', 'strength', false);
