import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, ChevronLeft } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WorkoutSession } from "@/types/database";

export default async function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: sessionRaw } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

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
    completed_at: string;
    exercises: { name: string; muscle_group: string } | null;
  };

  const { data: setsRaw } = await supabase
    .from("workout_sets")
    .select(`*, exercises(name, muscle_group)`)
    .eq("session_id", id)
    .order("completed_at");

  const sets = setsRaw as SetWithExercise[] | null;

  // Group sets by exercise
  const byExercise = new Map<string, SetWithExercise[]>();
  for (const s of sets ?? []) {
    const key = s.exercise_id;
    if (!byExercise.has(key)) byExercise.set(key, []);
    byExercise.get(key)!.push(s);
  }

  const duration = session.finished_at
    ? differenceInMinutes(new Date(session.finished_at), new Date(session.started_at))
    : null;

  const totalVolume = (sets ?? []).reduce(
    (sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0),
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/history" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold truncate">{session.name}</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
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
        {totalVolume > 0 && (
          <Badge variant="secondary">
            {totalVolume.toLocaleString()} lbs total volume
          </Badge>
        )}
      </div>

      {sets?.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-8">No sets logged for this workout.</p>
      )}

      <div className="space-y-3">
        {[...byExercise.entries()].map(([exerciseId, exSets]) => {
          const exerciseName = exSets?.[0]?.exercises?.name ?? "Unknown";
          return (
            <Card key={exerciseId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{exerciseName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="grid grid-cols-3 text-xs text-muted-foreground font-medium mb-2">
                    <span>Set</span>
                    <span className="text-center">Weight</span>
                    <span className="text-center">Reps</span>
                  </div>
                  {exSets?.map((s) => (
                    <div key={s.id} className="grid grid-cols-3 text-sm">
                      <span className="text-muted-foreground">{s.set_number}</span>
                      <span className="text-center">
                        {s.is_bodyweight ? "BW" : s.weight ? `${s.weight} ${s.weight_unit}` : "—"}
                      </span>
                      <span className="text-center">{s.reps ?? "—"}</span>
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
