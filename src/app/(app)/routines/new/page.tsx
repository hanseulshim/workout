import { RoutineBuilder } from "@/components/routines/routine-builder";
import { createClient } from "@/lib/supabase/server";
export const metadata = { title: "New Routine | Workout" };


export default async function NewRoutinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: exercises } = await supabase.from("exercises").select("*").order("name");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">New Routine</h1>
      <RoutineBuilder exercises={exercises ?? []} userId={user!.id} />
    </div>
  );
}
