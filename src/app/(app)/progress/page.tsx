import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import type { MuscleGroup } from "@/types/database";
export const metadata = { title: "Progress | Workout" };


type LastSet = { weight: number | null; reps: number | null; duration_seconds: number | null; weight_unit: string; log_type: string };

function formatLastSet(last: LastSet | undefined) {
  if (!last) return null;
  let label = "";
  if (last.log_type === "duration" && last.duration_seconds) {
    const s = last.duration_seconds;
    label = `Last: ${s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}s`}`;
  } else if (last.log_type === "bodyweight_reps" && last.reps) {
    label = `Last: ${last.reps} reps`;
  } else if (last.weight && last.reps) {
    label = `Last: ${last.weight} ${last.weight_unit} × ${last.reps}`;
  } else if (last.reps) {
    label = `Last: ${last.reps} reps`;
  }
  if (!label) return null;
  return <p className="mt-1 text-xs text-muted-foreground">{label}</p>;
}

const muscleGroupLabels: Record<MuscleGroup, string> = {
  chest: "Chest", back: "Back", shoulders: "Shoulders",
  biceps: "Biceps", triceps: "Triceps", forearms: "Forearms",
  core: "Core", glutes: "Glutes", quads: "Quads",
  hamstrings: "Hamstrings", calves: "Calves", full_body: "Full Body", other: "Other",
};

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  type LoggedExercise = {
    id: string;
    name: string;
    muscle_group: MuscleGroup;
    category: string;
  };

  type LastSetRow = {
    exercise_id: string;
    weight: number | null;
    reps: number | null;
    duration_seconds: number | null;
    weight_unit: string;
    log_type: string;
  };

  const [{ data: exercises, error: loggedError }, { data: lastSetsData, error: lastSetsError }] =
    await Promise.all([
      supabase.rpc("get_user_exercises", { p_user_id: user.id }) as unknown as Promise<{ data: LoggedExercise[] | null; error: unknown }>,
      supabase.rpc("get_user_last_sets", { p_user_id: user.id }) as unknown as Promise<{ data: LastSetRow[] | null; error: unknown }>,
    ]);

  if (loggedError) throw loggedError;
  if (lastSetsError) throw lastSetsError;

  const lastSetByExercise: Record<string, LastSetRow> = {};
  for (const row of lastSetsData ?? []) {
    lastSetByExercise[row.exercise_id] = row;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Progress</h1>
      {(exercises ?? []).length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-12">
          Log some workouts to track progress here!
        </p>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(exercises ?? []).map((ex) => (
          <Card key={ex.id}>
            <Link href={`/progress/${ex.id}`}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{ex.name}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {muscleGroupLabels[ex.muscle_group]}
                  </Badge>
                  {formatLastSet(lastSetByExercise[ex.id])}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
