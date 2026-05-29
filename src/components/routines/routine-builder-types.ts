"use client";

import type { LogType, RoutineExercise } from "@/types/database";

export type SetTarget = NonNullable<RoutineExercise["set_targets"]>[number];

export interface RoutineExerciseRow {
  exercise_id: string;
  position: number;
  default_sets: number;
  default_reps: number | null;
  set_targets: SetTarget[] | null;
  superset_id: string | null;
  notes: string | null;
  rest_seconds: number | null;
  exercises: { id: string; name: string; log_type: LogType; gif_url: string | null } | null;
}

export interface ExistingRoutine {
  id: string;
  name: string;
  days: number[];
  routine_exercises: RoutineExerciseRow[];
}

export interface SelectedExercise {
  exerciseId: string;
  name: string;
  gifUrl: string | null;
  logType: LogType;
  sets: SetTarget[];
  supersetId: string | null;
  notes: string;
  restSeconds: number;
}
