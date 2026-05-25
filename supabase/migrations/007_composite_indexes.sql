CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_finished
  ON workout_sessions(user_id, finished_at DESC);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_routine_finished
  ON workout_sessions(user_id, routine_id, finished_at DESC);

CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_completed
  ON workout_sets(exercise_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_workout_sets_session
  ON workout_sets(session_id);
