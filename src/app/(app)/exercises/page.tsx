import { createClient } from "@/lib/supabase/server";
import { ExerciseList } from "@/components/exercises/exercise-list";

export default async function ExercisesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: exercises } = await supabase
    .from("exercises")
    .select("*")
    .or(`is_custom.eq.false,user_id.eq.${user!.id}`)
    .order("name");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Exercises</h1>
      <ExerciseList exercises={exercises ?? []} userId={user!.id} />
    </div>
  );
}
