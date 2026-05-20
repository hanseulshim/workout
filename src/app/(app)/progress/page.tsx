import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import type { MuscleGroup } from "@/types/database";

const muscleGroupLabels: Record<MuscleGroup, string> = {
  chest: "Chest", back: "Back", shoulders: "Shoulders",
  biceps: "Biceps", triceps: "Triceps", forearms: "Forearms",
  core: "Core", glutes: "Glutes", quads: "Quads",
  hamstrings: "Hamstrings", calves: "Calves", full_body: "Full Body", other: "Other",
};

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  type LoggedExercise = {
    id: string;
    name: string;
    muscle_group: MuscleGroup;
    category: string;
  };

  // Get all exercises the user has logged
  const { data: loggedExercises } = await supabase
    .from("workout_sets")
    .select(`exercise_id, exercises(id, name, muscle_group, category)`)
    .eq("workout_sessions.user_id", user!.id)
    .limit(200);

  // Deduplicate
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
