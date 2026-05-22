import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Pencil, Play, Calendar, Dumbbell } from "lucide-react";
import { format } from "date-fns";
import { RoutineVolumeChart } from "@/components/routines/routine-volume-chart";
import { RoutineDeleteButton } from "@/components/routines/routine-delete-button";

export default async function RoutineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: routine }, { data: sessions }] = await Promise.all([
    supabase
      .from("routines")
      .select(`*, routine_exercises(position, default_sets, default_reps, set_targets, exercises(id, name, muscle_group))`)
      .eq("id", id)
      .eq("user_id", user!.id)
      .single(),
    supabase
      .from("workout_sessions")
      .select("id, name, started_at, finished_at")
      .eq("routine_id", id)
      .eq("user_id", user!.id)
      .order("started_at", { ascending: false })
      .limit(20),
  ]);

  if (!routine) notFound();

  const exercises = (routine.routine_exercises as Array<{
    position: number;
    default_sets: number;
    default_reps: number | null;
    set_targets: Array<{ reps: string }> | null;
    exercises: { id: string; name: string; muscle_group: string } | null;
  }>)
    .sort((a, b) => a.position - b.position)
    .filter((re) => re.exercises);

  // Fetch volume data for each session
  const sessionIds = (sessions ?? []).map((s) => s.id);
  const volumeBySession: { date: string; volume: number; reps: number }[] = [];

  if (sessionIds.length > 0) {
    const { data: sets } = await supabase
      .from("workout_sets")
      .select("session_id, weight, reps, completed_at")
      .in("session_id", sessionIds);

    const bySession = new Map<string, { volume: number; reps: number }>();
    for (const s of sets ?? []) {
      if (!bySession.has(s.session_id)) bySession.set(s.session_id, { volume: 0, reps: 0 });
      const entry = bySession.get(s.session_id)!;
      entry.volume += (s.weight ?? 0) * (s.reps ?? 0);
      entry.reps += s.reps ?? 0;
    }

    // Build chronological array for chart
    const chronological = [...(sessions ?? [])].reverse();
    for (const sess of chronological) {
      const data = bySession.get(sess.id) ?? { volume: 0, reps: 0 };
      volumeBySession.push({
        date: format(new Date(sess.started_at), "MMM d"),
        volume: Math.round(data.volume),
        reps: data.reps,
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href="/routines" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 shrink-0")}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{routine.name}</h1>
            <p className="text-sm text-muted-foreground">{exercises.length} exercises</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <RoutineDeleteButton routineId={id} />
          <Link
            href={`/routines/${id}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Link>
          <Link
            href={`/workout/start?routine=${id}`}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Start
          </Link>
        </div>
      </div>

      {/* Exercise list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Exercises
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {exercises.map((re, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">{re.exercises!.name}</span>
                <span className="text-muted-foreground ml-2">{re.exercises!.muscle_group}</span>
              </div>
              <span className="text-muted-foreground text-xs">
                {re.set_targets ? re.set_targets.length : re.default_sets} sets
              </span>
            </div>
          ))}
          {exercises.length === 0 && (
            <p className="text-sm text-muted-foreground">No exercises added yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Volume chart */}
      {volumeBySession.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Volume Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <RoutineVolumeChart data={volumeBySession} />
          </CardContent>
        </Card>
      )}

      {/* Session history */}
      {(sessions ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(sessions ?? []).map((sess) => (
              <Link
                key={sess.id}
                href={`/history/${sess.id}`}
                className="flex items-center justify-between text-sm py-1.5 hover:opacity-70 transition-opacity"
              >
                <span className="font-medium">{format(new Date(sess.started_at), "EEE, MMM d yyyy")}</span>
                <span className="text-muted-foreground text-xs">
                  {sess.finished_at
                    ? `${Math.round((new Date(sess.finished_at).getTime() - new Date(sess.started_at).getTime()) / 60000)} min`
                    : "In progress"}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {(sessions ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No sessions yet. Hit <strong>Start</strong> to log your first workout!
        </p>
      )}
    </div>
  );
}
