"use client";

import { createClient } from "@/lib/supabase/client";
import type { ExistingRoutine, SelectedExercise } from "./routine-builder-types";

interface SaveRoutineParams {
  name: string;
  days: number[];
  selected: SelectedExercise[];
  userId: string;
  routine?: ExistingRoutine;
}

export async function saveRoutine({ name, days, selected, userId, routine }: SaveRoutineParams) {
  const supabase = createClient();
  const rows = selected.map((ex, i) => ({
    exercise_id: ex.exerciseId,
    position: i,
    default_sets: ex.sets.length,
    default_reps: ex.sets[0]?.reps ? parseInt(ex.sets[0].reps) : null,
    set_targets: ex.sets,
    superset_id: ex.supersetId,
    notes: ex.notes || null,
    rest_seconds: ex.restSeconds > 0 ? ex.restSeconds : null,
  }));

  if (routine) {
    const originalRows = routine.routine_exercises.map((exercise, index) => ({
      routine_id: routine.id,
      exercise_id: exercise.exercise_id,
      position: exercise.position ?? index,
      default_sets: exercise.default_sets,
      default_reps: exercise.default_reps,
      set_targets: exercise.set_targets,
      superset_id: exercise.superset_id,
      notes: exercise.notes,
      rest_seconds: exercise.rest_seconds,
    }));

    const { error: updateError } = await supabase.from("routines").update({ name, days, updated_at: new Date().toISOString() }).eq("id", routine.id);
    if (updateError) throw updateError;
    const { error: deleteError } = await supabase.from("routine_exercises").delete().eq("routine_id", routine.id);
    if (deleteError) throw deleteError;
    const { error: insertError } = await supabase.from("routine_exercises").insert(rows.map((row) => ({ routine_id: routine.id, ...row })));

    if (insertError) {
      if (originalRows.length > 0) {
        const { error: restoreError } = await supabase.from("routine_exercises").insert(originalRows);
        if (restoreError) console.error("Failed to restore original routine exercises", restoreError);
      }
      throw insertError;
    }

    return routine.id;
  }

  const { data: newRoutine, error } = await supabase.from("routines").insert({ user_id: userId, name, days }).select("id").single();
  if (error || !newRoutine) throw error ?? new Error("Failed to create routine");
  const { error: insertError } = await supabase.from("routine_exercises").insert(rows.map((row) => ({ routine_id: newRoutine.id, ...row })));
  if (insertError) throw insertError;
  return newRoutine.id;
}
