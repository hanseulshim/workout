ALTER TABLE routines ADD COLUMN IF NOT EXISTS last_used_at timestamptz;
ALTER TABLE routine_exercises ADD COLUMN IF NOT EXISTS rest_seconds integer;

UPDATE routines AS r
SET last_used_at = session_summary.last_used_at
FROM (
  SELECT routine_id, MAX(finished_at) AS last_used_at
  FROM workout_sessions
  WHERE routine_id IS NOT NULL
  GROUP BY routine_id
) AS session_summary
WHERE r.id = session_summary.routine_id;

CREATE INDEX IF NOT EXISTS idx_routines_user_last_used
  ON routines(user_id, last_used_at DESC);
