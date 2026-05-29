import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WorkoutStartClient } from "@/components/workout/workout-start-client";
export const metadata = { title: "Start Workout | Workout" };

export default async function WorkoutStartPage({
  searchParams,
}: {
  searchParams: Promise<{ routine?: string }>;
}) {
  const { routine: routineId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: routines, error: routinesError }, { data: preselectedRoutine }, { data: bestsRaw, error: bestsError }] = await Promise.all([
    supabase
      .from("routines")
      .select("id, name, days")
      .eq("user_id", user.id)
      .order("last_used_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false }),
    routineId
      ? supabase
          .from("routines")
          .select(`id, name, days, routine_exercises(id, exercise_id, position, default_sets, default_reps, set_targets, superset_id, rest_seconds, notes, exercises(id, name, log_type, gif_url))`)
          .eq("id", routineId)
          .eq("user_id", user.id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from("workout_sets")
      .select("exercise_id, weight, reps, duration_seconds, workout_sessions!inner(user_id)")
      .eq("workout_sessions.user_id", user.id),
  ]);

  if (routinesError) throw routinesError;
  if (bestsError) throw bestsError;

  type PersonalBest = {
    exercise_id: string;
    weight: number | null;
    reps: number | null;
    duration_seconds: number | null;
  };

  const personalBests: Record<string, { weight: number | null; reps: number | null; duration: number | null }> = {};
  for (const setItem of (bestsRaw ?? []) as PersonalBest[]) {
    const current = personalBests[setItem.exercise_id] ?? { weight: null, reps: null, duration: null };
    if (setItem.weight !== null && (current.weight === null || setItem.weight > current.weight)) current.weight = setItem.weight;
    if (setItem.reps !== null && (current.reps === null || setItem.reps > current.reps)) current.reps = setItem.reps;
    if (setItem.duration_seconds !== null && (current.duration === null || setItem.duration_seconds > current.duration)) {
      current.duration = setItem.duration_seconds;
    }
    personalBests[setItem.exercise_id] = current;
  }

  type LastSet = {
    exercise_id: string;
    set_number: number;
    weight: number | null;
    reps: number | null;
    weight_unit: string;
    duration_seconds: number | null;
  };

  let lastSets: LastSet[] = [];
  if (routineId) {
    const { data: lastSession } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("routine_id", routineId)
      .eq("user_id", user.id)
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(1)
      .single();

    if (lastSession) {
      const { data: sets } = await supabase
        .from("workout_sets")
        .select("exercise_id, set_number, weight, reps, weight_unit, duration_seconds")
        .eq("session_id", lastSession.id)
        .order("set_number");
      lastSets = (sets ?? []) as LastSet[];
    }
  }

  const normalizedPreselectedRoutine = preselectedRoutine
    ? {
        ...preselectedRoutine,
        routine_exercises: preselectedRoutine.routine_exercises.map((exercise) => ({
          ...exercise,
          exercises: Array.isArray(exercise.exercises) ? exercise.exercises[0] ?? null : exercise.exercises,
        })),
      }
    : null;

  return (
    <WorkoutStartClient
      routines={routines ?? []}
      preselectedRoutine={normalizedPreselectedRoutine}
      userId={user.id}
      lastSets={lastSets}
      personalBests={personalBests}
    />
  );
}
