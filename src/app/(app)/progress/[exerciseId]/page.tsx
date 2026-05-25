import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProgressCharts } from "@/components/progress/progress-charts";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
export const metadata = { title: "Exercise Progress | Workout" };

export default async function ExerciseProgressPage({ params }: { params: Promise<{ exerciseId: string }> }) {
  const { exerciseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: exercise } = await supabase
    .from("exercises")
    .select("id, name, log_type")
    .eq("id", exerciseId)
    .single();

  if (!exercise) notFound();

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("id, weight, reps, duration_seconds, completed_at, weight_unit, is_bodyweight, workout_sessions!inner(started_at, user_id)")
    .eq("exercise_id", exerciseId)
    .eq("workout_sessions.user_id", user!.id)
    .order("completed_at", { ascending: true })
    .limit(200);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/progress" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold">{exercise.name}</h1>
      </div>
      <p className="text-xs text-muted-foreground">Showing the latest 200 logged sets for readability.</p>
      <ProgressCharts sets={sets ?? []} />
    </div>
  );
}
