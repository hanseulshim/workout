ALTER TABLE workout_sessions
ADD CONSTRAINT workout_sessions_user_started_unique UNIQUE (user_id, started_at);
