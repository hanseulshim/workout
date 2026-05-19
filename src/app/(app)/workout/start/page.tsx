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

  return (
    <WorkoutStartClient
      routines={routines ?? []}
      preselectedRoutine={preselectedRoutine}
      userId={user!.id}
    />
  );
}
