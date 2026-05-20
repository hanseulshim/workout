-- Add equipment_type and log_type enums
create type equipment_type as enum (
  'barbell', 'dumbbell', 'bodyweight', 'machine', 'cable',
  'ez_bar', 'kettlebell', 'band', 'plate', 'other'
);

create type log_type as enum (
  'weight_reps',           -- weight + reps (barbell, dumbbell, machine, cable)
  'bodyweight_reps',       -- reps only (push-up, pull-up)
  'weighted_bodyweight',   -- added weight + reps (weighted pull-up, dips)
  'assisted_bodyweight',   -- assistance weight + reps (assisted pull-up)
  'duration'               -- time only (plank, cardio)
);

-- Add columns to exercises
alter table exercises
  add column equipment_type equipment_type not null default 'other',
  add column log_type log_type not null default 'weight_reps';

-- ─── Update existing seed exercises ──────────────────────────────────────────

-- Barbell
update exercises set equipment_type = 'barbell', log_type = 'weight_reps'
where name in (
  'Bench Press', 'Incline Bench Press', 'Decline Bench Press',
  'Deadlift', 'Romanian Deadlift', 'Barbell Row', 'T-Bar Row', 'Good Morning',
  'Overhead Press', 'Upright Row', 'Shrugs',
  'Barbell Curl', 'Preacher Curl', 'Close-Grip Bench Press',
  'Wrist Curl', 'Reverse Wrist Curl',
  'Hip Thrust', 'Squat', 'Front Squat', 'Stiff-Leg Deadlift',
  'Power Clean', 'Clean and Jerk', 'Snatch', 'Thruster', 'Lunge', 'Walking Lunge', 'Step-Up'
);

-- EZ Bar (override some barbell ones)
update exercises set equipment_type = 'ez_bar', log_type = 'weight_reps'
where name in ('EZ Bar Curl', 'Skull Crusher');

-- Dumbbell
update exercises set equipment_type = 'dumbbell', log_type = 'weight_reps'
where name in (
  'Dumbbell Chest Press', 'Incline Dumbbell Press', 'Chest Fly',
  'Dumbbell Row',
  'Seated Dumbbell Press', 'Arnold Press', 'Lateral Raise', 'Front Raise', 'Rear Delt Fly',
  'Dumbbell Curl', 'Hammer Curl', 'Incline Dumbbell Curl', 'Concentration Curl',
  'Overhead Tricep Extension', 'Kickbacks',
  'Farmers Walk', 'Goblet Squat', 'Bulgarian Split Squat', 'Goblet Squat'
);

-- Cable
update exercises set equipment_type = 'cable', log_type = 'weight_reps'
where name in (
  'Cable Chest Fly', 'Cable Lateral Raise', 'Face Pull', 'Seated Cable Row',
  'Lat Pulldown', 'Cable Curl', 'Tricep Pushdown',
  'Cable Crunch', 'Cable Kickback', 'Woodchop'
);

-- Machine (weight & reps)
update exercises set equipment_type = 'machine', log_type = 'weight_reps'
where name in (
  'Pec Deck', 'Back Extension',
  'Hack Squat', 'Leg Press', 'Leg Extension',
  'Leg Curl', 'Seated Leg Curl',
  'Standing Calf Raise', 'Seated Calf Raise', 'Donkey Calf Raise'
);

-- Kettlebell
update exercises set equipment_type = 'kettlebell', log_type = 'weight_reps'
where name in ('Kettlebell Swing', 'Turkish Get-Up');

-- Bodyweight — reps only
update exercises set equipment_type = 'bodyweight', log_type = 'bodyweight_reps'
where name in (
  'Push-Up', 'Incline Push-Up', 'Diamond Push-Up',
  'Chin-Up',
  'Crunches', 'Bicycle Crunch', 'Leg Raise', 'Russian Twist',
  'Ab Wheel Rollout', 'Hanging Leg Raise',
  'Glute Bridge', 'Donkey Kick',
  'Nordic Curl', 'Burpee', 'Box Jump'
);

-- Bodyweight — can add weight
update exercises set equipment_type = 'bodyweight', log_type = 'weighted_bodyweight'
where name in ('Pull-Up', 'Dips', 'Tricep Dips');

-- Duration — bodyweight
update exercises set equipment_type = 'bodyweight', log_type = 'duration'
where name in ('Plank', 'Side Plank');

-- Duration — cardio/machine
update exercises set equipment_type = 'machine', log_type = 'duration'
where name in ('Rowing Machine', 'Stair Climber', 'Elliptical');

update exercises set equipment_type = 'other', log_type = 'duration'
where name in ('Running', 'Cycling', 'Jump Rope', 'Swimming');
