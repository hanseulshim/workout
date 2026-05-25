import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RoutineBuilder } from "@/components/routines/routine-builder";
export const metadata = { title: "New Routine | Workout" };

export default async function NewRoutinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: exercises, error } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, category, equipment_type, log_type, gif_url, is_custom, user_id, created_at")
    .order("name");

  if (error) throw error;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">New Routine</h1>
      <RoutineBuilder exercises={exercises ?? []} userId={user.id} />
    </div>
  );
}
