import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { RoutineBuilder } from "@/components/routines/routine-builder";
export const metadata = { title: "Edit Routine | Workout" };

export const dynamic = "force-dynamic";

export default async function EditRoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: routine, error: routineError }, { data: exercises, error: exercisesError }] = await Promise.all([
    supabase
      .from("routines")
      .select(`id, name, days, routine_exercises(id, exercise_id, position, default_sets, default_reps, set_targets, superset_id, notes, rest_seconds, exercises(id, name, log_type, gif_url))`)
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("exercises")
      .select("id, name, muscle_group, category, equipment_type, log_type, gif_url, is_custom, user_id, created_at")
      .order("name"),
  ]);

  if (routineError && routineError.code !== "PGRST116") throw routineError;
  if (exercisesError) throw exercisesError;

  if (!routine) notFound();

  const normalizedRoutine = {
    ...routine,
    routine_exercises: routine.routine_exercises.map((exercise) => ({
      ...exercise,
      exercises: Array.isArray(exercise.exercises) ? exercise.exercises[0] ?? null : exercise.exercises,
    })),
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Edit Routine</h1>
      <RoutineBuilder exercises={exercises ?? []} userId={user.id} routine={normalizedRoutine} />
    </div>
  );
}
