import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import type { MuscleGroup } from "@/types/database";
export const metadata = { title: "Progress | Workout" };


type LastSet = { weight: number | null; reps: number | null; duration_seconds: number | null; weight_unit: string; log_type: string };

function formatLastSet(last: LastSet | undefined): string | null {
  if (!last) return null;
  if (last.log_type === "duration" && last.duration_seconds) {
    const s = last.duration_seconds;
    return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}s`;
  }
  if (last.weight && last.reps) return `${last.weight} ${last.weight_unit} × ${last.reps}`;
  if (last.reps) return `${last.reps} reps`;
  return null;
}

const MUSCLE_GROUP_ORDER: MuscleGroup[] = [
  "chest", "back", "shoulders", "biceps", "triceps", "forearms",
  "core", "quads", "hamstrings", "glutes", "calves", "full_body", "other",
];

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

  type LoggedExercise = { id: string; name: string; muscle_group: MuscleGroup; category: string };
  type LastSetRow = { exercise_id: string; weight: number | null; reps: number | null; duration_seconds: number | null; weight_unit: string; log_type: string };

  const [{ data: exercises, error: loggedError }, { data: lastSetsData, error: lastSetsError }] =
    await Promise.all([
      supabase.rpc("get_user_exercises", { p_user_id: user.id }) as unknown as Promise<{ data: LoggedExercise[] | null; error: unknown }>,
      supabase.rpc("get_user_last_sets", { p_user_id: user.id }) as unknown as Promise<{ data: LastSetRow[] | null; error: unknown }>,
    ]);

  if (loggedError) throw loggedError;
  if (lastSetsError) throw lastSetsError;

  const lastSetByExercise: Record<string, LastSetRow> = {};
  for (const row of lastSetsData ?? []) lastSetByExercise[row.exercise_id] = row;

  // Group by muscle group
  const byGroup = new Map<MuscleGroup, LoggedExercise[]>();
  for (const ex of exercises ?? []) {
    if (!byGroup.has(ex.muscle_group)) byGroup.set(ex.muscle_group, []);
    byGroup.get(ex.muscle_group)!.push(ex);
  }
  const groups = MUSCLE_GROUP_ORDER.filter((g) => byGroup.has(g));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Progress</h1>
      {groups.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-12">
          Log some workouts to track progress here!
        </p>
      )}
      {groups.map((group) => (
        <Card key={group}>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {muscleGroupLabels[group]}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 divide-y">
            {byGroup.get(group)!.map((ex) => {
              const lastSet = formatLastSet(lastSetByExercise[ex.id]);
              return (
                <Link
                  key={ex.id}
                  href={`/progress/${ex.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:bg-muted/50 -mx-2 px-2 transition-colors first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{ex.name}</p>
                    {lastSet && <p className="text-xs text-muted-foreground mt-0.5">{lastSet}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
