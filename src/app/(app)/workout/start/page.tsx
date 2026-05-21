import { createClient } from "@/lib/supabase/server";
import { WorkoutStartClient } from "@/components/workout/workout-start-client";

export default async function WorkoutStartPage({
  searchParams,
}: {
  searchParams: Promise<{ routine?: string }>;
}) {
  const { routine: routineId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: routines }, { data: preselectedRoutine }] = await Promise.all([
    supabase
      .from("routines")
      .select("id, name")
      .eq("user_id", user!.id)
      .order("updated_at", { ascending: false }),
    routineId
      ? supabase
          .from("routines")
          .select(`*, routine_exercises(*, exercises(*))`)
          .eq("id", routineId)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  // Fetch last completed session's sets for this routine (for pre-fill)
  type LastSet = { exercise_id: string; set_number: number; weight: number | null; reps: number | null; weight_unit: string; duration_seconds: number | null };
  let lastSets: LastSet[] = [];
  if (routineId) {
    const { data: lastSession } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("routine_id", routineId)
      .eq("user_id", user!.id)
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

  return (
    <WorkoutStartClient
      routines={routines ?? []}
      preselectedRoutine={preselectedRoutine}
      userId={user!.id}
      lastSets={lastSets}
    />
  );
}
