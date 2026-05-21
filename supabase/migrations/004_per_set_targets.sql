-- Add per-set targets to routine_exercises
ALTER TABLE routine_exercises ADD COLUMN IF NOT EXISTS set_targets JSONB;
-- set_targets: [{"reps": "12"}, {"reps": "10"}, {"reps": "8"}]
-- null means fall back to default_sets/default_reps behaviour
COMMENT ON COLUMN routine_exercises.set_targets IS 'Array of per-set targets [{reps: string}]. Length overrides default_sets when present.';
