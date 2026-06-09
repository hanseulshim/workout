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
    const routineResults = await Promise.allSettled([
      ...activeWorkout.exercises.map(async (exercise) => {
        const completedExerciseSets = exercise.sets.filter((setItem) => setItem.completed);

        const updateData: Record<string, unknown> = {
          notes: exercise.notes || null,
          rest_seconds: exercise.restSeconds,
        };

        if (completedExerciseSets.length > 0) {
          const setTargets = exercise.sets.map((setItem) => ({
            reps: exercise.logType === "duration"
              ? setItem.durationSeconds ?? ""
              : setItem.reps ?? "",
            weight: setItem.weight ?? "",
          }));
          updateData.set_targets = setTargets;
          updateData.default_sets = setTargets.length;
        }

        const { error } = await supabase
          .from("routine_exercises")
          .update(updateData)
          .eq("routine_id", activeWorkout.routineId!)
          .eq("exercise_id", exercise.exerciseId);

        if (error) throw error;
      }),
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
