import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, ChevronLeft, Clock } from "lucide-react";
import { differenceInMinutes, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { WorkoutSession } from "@/types/database";
export const metadata = { title: "Workout Detail | Workout" };

export default async function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: sessionRaw, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("id, name, started_at, finished_at, notes")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (sessionError && sessionError.code !== "PGRST116") throw sessionError;
  if (!sessionRaw) notFound();
  const session = sessionRaw as WorkoutSession;

  type SetWithExercise = {
    id: string;
    exercise_id: string;
    set_number: number;
    weight: number | null;
    reps: number | null;
    weight_unit: string;
    is_bodyweight: boolean;
    duration_seconds: number | null;
    completed_at: string;
    exercises: { name: string; muscle_group: string; log_type: string } | null;
  };

  const { data: setsRaw, error: setsError } = await supabase
    .from("workout_sets")
    .select("id, exercise_id, set_number, weight, reps, weight_unit, is_bodyweight, duration_seconds, completed_at, exercises(name, muscle_group, log_type)")
    .eq("session_id", id)
    .order("completed_at");

  if (setsError) throw setsError;

  const sets = setsRaw as unknown as SetWithExercise[] | null;
  const byExercise = new Map<string, SetWithExercise[]>();
  for (const setItem of sets ?? []) {
    const key = setItem.exercise_id;
    if (!byExercise.has(key)) byExercise.set(key, []);
    byExercise.get(key)!.push(setItem);
  }

  const duration = session.finished_at
    ? differenceInMinutes(new Date(session.finished_at), new Date(session.started_at))
    : null;
  const totalVolume = (sets ?? []).reduce((sum, setItem) => sum + (setItem.weight ?? 0) * (setItem.reps ?? 0), 0);
  const volumeUnit = (sets ?? []).find((setItem) => setItem.weight != null)?.weight_unit ?? "lbs";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/history" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="truncate text-xl font-bold">{session.name}</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {format(new Date(session.started_at), "MMM d, yyyy")}
        </Badge>
        {duration !== null && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {duration} min
          </Badge>
        )}
        {totalVolume > 0 && <Badge variant="secondary">{totalVolume.toLocaleString()} {volumeUnit} total volume</Badge>}
      </div>

      {sets?.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">No sets logged for this workout.</p>
      )}

      <div className="space-y-3">
        {[...byExercise.entries()].map(([exerciseId, exerciseSets]) => {
          const exerciseName = exerciseSets[0]?.exercises?.name ?? "Unknown";
          const logType = exerciseSets[0]?.exercises?.log_type ?? "weight_reps";
          const isDuration = logType === "duration";
          const isBodyweightOnly = logType === "bodyweight_reps";
          const showWeight = !isDuration && !isBodyweightOnly;
          const colClass = showWeight ? "grid-cols-[2rem_1fr_1fr]" : "grid-cols-[2rem_1fr]";
          const weightLabel = logType === "weighted_bodyweight" ? "+Weight" : logType === "assisted_bodyweight" ? "Assist" : "Weight";

          const formatDuration = (s: number) =>
            s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}s`;

          return (
            <Card key={exerciseId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{exerciseName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  <div className={`grid ${colClass} gap-2 px-1 text-xs font-medium text-muted-foreground`}>
                    <span className="text-center">Set</span>
                    {showWeight && <span className="text-center">{weightLabel}</span>}
                    <span className="text-center">{isDuration ? "Duration" : "Reps"}</span>
                  </div>
                  {exerciseSets.map((setItem) => (
                    <div key={setItem.id} className={`grid ${colClass} gap-2 items-center`}>
                      <span className="text-xs font-medium text-center text-muted-foreground">{setItem.set_number}</span>
                      {showWeight && (
                        <span className="h-8 flex items-center justify-center text-sm border rounded-md bg-muted/30 tabular-nums">
                          {setItem.weight != null ? `${setItem.weight} ${setItem.weight_unit}` : setItem.is_bodyweight ? "BW" : "—"}
                        </span>
                      )}
                      <span className="h-8 flex items-center justify-center text-sm border rounded-md bg-muted/30 tabular-nums">
                        {isDuration
                          ? (setItem.duration_seconds != null ? formatDuration(setItem.duration_seconds) : "—")
                          : (setItem.reps ?? "—")}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {session.notes && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">{session.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
