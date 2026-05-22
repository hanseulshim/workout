import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { RoutineBuilder } from "@/components/routines/routine-builder";

export const dynamic = "force-dynamic";

export default async function EditRoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: routine }, { data: exercises }] = await Promise.all([
    supabase
      .from("routines")
      .select(`*, routine_exercises(*, exercises(*))`)
      .eq("id", id)
      .eq("user_id", user!.id)
      .single(),
    supabase.from("exercises").select("*").order("name"),
  ]);

  if (!routine) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Edit Routine</h1>
      <RoutineBuilder exercises={exercises ?? []} userId={user!.id} routine={routine} />
    </div>
  );
}
