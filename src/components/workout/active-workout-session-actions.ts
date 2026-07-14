"use client";

import { createClient } from "@/lib/supabase/client";
import type { ActiveWorkout } from "@/store/workout-store";

function parseIntOrNull(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFloatOrNull(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function updateFinishedAtWithRetry(
  sessionId: string,
  finishedAt: string,
  attempts = 2,
) {
  const supabase = createClient();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const { error } = await supabase.from("workout_sessions").update({ finished_at: finishedAt }).eq("id", sessionId);
    if (!error) return;
    lastError = error;
  }

  throw lastError ?? new Error("Failed to finish workout session");
}

export async function saveActiveWorkout(activeWorkout: ActiveWorkout, finishedAt: string) {
  const supabase = createClient();
  const setsToInsert = activeWorkout.exercises.flatMap((exercise) =>
    exercise.sets.filter((setItem) => setItem.completed).map((setItem) => ({
      session_id: activeWorkout.sessionId!,
      exercise_id: exercise.exerciseId,
      set_number: setItem.setNumber,
      reps: exercise.logType === "duration" ? null : parseIntOrNull(setItem.reps),
      weight: ["weight_reps", "weighted_bodyweight", "assisted_bodyweight"].includes(exercise.logType)
        ? parseFloatOrNull(setItem.weight)
        : null,
      weight_unit: setItem.weightUnit,
      is_bodyweight: ["bodyweight_reps", "weighted_bodyweight", "assisted_bodyweight"].includes(exercise.logType),
      duration_seconds: exercise.logType === "duration" ? parseIntOrNull(setItem.durationSeconds) : null,
    })),
  );

  let insertedSetIds: string[] = [];

  if (setsToInsert.length > 0) {
    const { data, error } = await supabase.from("workout_sets").insert(setsToInsert).select("id");
    if (error) throw error;
    insertedSetIds = (data ?? []).map((row) => row.id);
  }

  try {
    await updateFinishedAtWithRetry(activeWorkout.sessionId!, finishedAt);
  } catch (error) {
    if (insertedSetIds.length > 0) {
      await supabase.from("workout_sets").delete().in("id", insertedSetIds);
    }
    throw error;
  }

  let routineSyncWarning = false;

  if (activeWorkout.routineId) {
    // Fetch existing routine_exercises so we know what to insert vs. update vs. delete
    const { data: existingRoutineExercises, error: fetchError } = await supabase
      .from("routine_exercises")
      .select("exercise_id")
      .eq("routine_id", activeWorkout.routineId);

    if (fetchError) throw fetchError;

    const existingExerciseIds = new Set(
      (existingRoutineExercises ?? []).map((row) => row.exercise_id),
    );
    const activeExerciseIds = new Set(
      activeWorkout.exercises.map((ex) => ex.exerciseId),
    );

    const hasActiveExercises = activeWorkout.exercises.length > 0;

    const routineResults = await Promise.allSettled([
      // Upsert: update existing routine_exercises rows and insert new ones
      ...activeWorkout.exercises.map(async (exercise, index) => {
        const completedExerciseSets = exercise.sets.filter((setItem) => setItem.completed);

        const exerciseData: Record<string, unknown> = {
          position: index + 1,
          notes: exercise.notes || null,
          rest_seconds: exercise.restSeconds,
          superset_id: exercise.supersetId,
        };

        if (completedExerciseSets.length > 0) {
          const setTargets = exercise.sets.map((setItem) => ({
            reps: exercise.logType === "duration"
              ? setItem.durationSeconds ?? ""
              : setItem.reps ?? "",
            weight: setItem.weight ?? "",
          }));
          exerciseData.set_targets = setTargets;
          exerciseData.default_sets = setTargets.length;
        }

        if (existingExerciseIds.has(exercise.exerciseId)) {
          // Update existing row
          const { error } = await supabase
            .from("routine_exercises")
            .update(exerciseData)
            .eq("routine_id", activeWorkout.routineId!)
            .eq("exercise_id", exercise.exerciseId);
          if (error) throw error;
        } else {
          // Insert new row for an exercise added during the workout
          const { error } = await supabase.from("routine_exercises").insert({
            routine_id: activeWorkout.routineId!,
            exercise_id: exercise.exerciseId,
            default_sets: (exerciseData.default_sets as number | undefined) ?? exercise.sets.length,
            set_targets: exerciseData.set_targets as Array<{ reps: string; weight?: string }> | undefined ?? null,
            notes: exerciseData.notes as string | null ?? null,
            rest_seconds: exerciseData.rest_seconds as number | null ?? null,
            superset_id: exerciseData.superset_id as string | null ?? null,
            position: index + 1,
          });
          if (error) throw error;
        }
      }),

      // Delete routine_exercises rows whose exercise was removed from the workout.
      // Only do this when the workout isn't empty — otherwise we'd accidentally
      // wipe the entire routine template.
      ...(hasActiveExercises
        ? Array.from(existingExerciseIds)
          .filter((exId) => !activeExerciseIds.has(exId))
          .map(async (exerciseId) => {
            const { error } = await supabase
              .from("routine_exercises")
              .delete()
              .eq("routine_id", activeWorkout.routineId!)
              .eq("exercise_id", exerciseId);
            if (error) throw error;
          })
        : []),

      supabase
        .from("routines")
        .update({ last_used_at: finishedAt })
        .eq("id", activeWorkout.routineId),
    ]);

    if (routineResults.some((result) => result.status === "rejected")) {
      console.warn("Routine sync warning", routineResults);
      routineSyncWarning = true;
    }
  }

  return { routineSyncWarning };
}

export async function discardActiveWorkout(sessionId: string) {
  const supabase = createClient();
  await supabase.from("workout_sessions").delete().eq("id", sessionId);
}
