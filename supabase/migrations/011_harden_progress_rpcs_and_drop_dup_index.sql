-- Harden progress RPCs to enforce auth.uid() ownership and drop redundant index.

create or replace function public.get_user_exercises(p_user_id uuid)
returns table (
  id              uuid,
  name            text,
  muscle_group    muscle_group,
  category        exercise_category
)
language sql stable security definer set search_path = public
as $$
  select distinct on (e.id) e.id, e.name, e.muscle_group, e.category
  from exercises e
  inner join workout_sets ws   on ws.exercise_id = e.id
  inner join workout_sessions s on ws.session_id = s.id
  where s.user_id = auth.uid()
    and s.user_id = p_user_id
  order by e.id;
$$;

create or replace function public.get_user_last_sets(p_user_id uuid)
returns table (
  exercise_id      uuid,
  weight           numeric,
  reps             integer,
  duration_seconds integer,
  weight_unit      weight_unit,
  log_type         log_type
)
language sql stable security definer set search_path = public
as $$
  select distinct on (ws.exercise_id)
    ws.exercise_id,
    ws.weight,
    ws.reps,
    ws.duration_seconds,
    ws.weight_unit,
    e.log_type
  from workout_sets ws
  inner join workout_sessions s on ws.session_id = s.id
  inner join exercises e        on ws.exercise_id = e.id
  where s.user_id = auth.uid()
    and s.user_id = p_user_id
  order by ws.exercise_id, ws.completed_at desc;
$$;

-- Drop redundant index that duplicates workout_sets_session_id_idx (from 001_initial_schema.sql).
drop index if exists public.idx_workout_sets_session;
