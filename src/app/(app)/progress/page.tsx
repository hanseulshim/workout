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

  // Get all exercises the user has logged (join through workout_sessions to filter by user)
  const { data: loggedExercises, error: loggedError } = await supabase
    .from("workout_sets")
    .select(`exercise_id, exercises(id, name, muscle_group, category), workout_sessions!inner(user_id)`)
    .eq("workout_sessions.user_id", user.id)
    .limit(500);

  if (loggedError) throw loggedError;

  // Deduplicate exercises client-side
  const seen = new Set<string>();
  const exercises = (loggedExercises ?? [])
    .map((row) => {
      const ex = row.exercises;
      return Array.isArray(ex) ? ex[0] : ex;
    })
    .filter((ex): ex is LoggedExercise => {
      if (!ex || seen.has(ex.id)) return false;
      seen.add(ex.id);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const exerciseIds = exercises.map((exercise) => exercise.id);
  const lastSetByExercise: Record<string, { weight: number | null; reps: number | null; duration_seconds: number | null; weight_unit: string; log_type: string }> = {};

  if (exerciseIds.length > 0) {
    type RecentSet = {
      exercise_id: string;
      weight: number | null;
      reps: number | null;
      duration_seconds: number | null;
      weight_unit: string;
      exercises: { log_type: string } | { log_type: string }[] | null;
    };

    const { data: recentSets, error: recentSetsError } = await supabase
      .from("workout_sets")
      .select("exercise_id, weight, reps, duration_seconds, weight_unit, completed_at, exercises(log_type), workout_sessions!inner(user_id)")
      .in("exercise_id", exerciseIds)
      .eq("workout_sessions.user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(500);

    if (recentSetsError) throw recentSetsError;

    for (const setItem of (recentSets ?? []) as RecentSet[]) {
      if (!lastSetByExercise[setItem.exercise_id]) {
        const exercise = Array.isArray(setItem.exercises) ? setItem.exercises[0] : setItem.exercises;
        lastSetByExercise[setItem.exercise_id] = {
          weight: setItem.weight,
          reps: setItem.reps,
          duration_seconds: setItem.duration_seconds,
          weight_unit: setItem.weight_unit,
          log_type: exercise?.log_type ?? "weight_reps",
        };
      }
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Progress</h1>
      {exercises.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-12">
          Log some workouts to track progress here!
        </p>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {exercises.map((ex) => (
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
