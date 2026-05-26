import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Pencil, Play, Calendar, Dumbbell } from "lucide-react";
import { format } from "date-fns";
import { RoutineVolumeChart } from "@/components/routines/routine-volume-chart";
import { RoutineDeleteButton } from "@/components/routines/routine-delete-button";
import { SessionHistoryList } from "@/components/routines/session-history-list";
export const metadata = { title: "Routine | Workout" };


export default async function RoutineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: routine, error: routineError }, { data: sessions, error: sessionsError }] = await Promise.all([
    supabase
      .from("routines")
      .select(`*, routine_exercises(position, default_sets, default_reps, set_targets, exercises(id, name, muscle_group, log_type))`)
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("workout_sessions")
      .select("id, name, started_at, finished_at")
      .eq("routine_id", id)
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(20),
  ]);

  if (routineError && routineError.code !== "PGRST116") throw routineError;
  if (sessionsError) throw sessionsError;

  if (!routine) notFound();

  const exercises = (routine.routine_exercises as Array<{
    position: number;
    default_sets: number;
    default_reps: number | null;
    set_targets: Array<{ reps: string }> | null;
    exercises: { id: string; name: string; muscle_group: string; log_type: string } | null;
  }>)
    .sort((a, b) => a.position - b.position)
    .filter((re) => re.exercises);

  // Fetch volume data for each session
  const sessionIds = (sessions ?? []).map((s) => s.id);
  const volumeBySession: { date: string; volume: number; reps: number }[] = [];
  let weightUnit = "lbs";

  if (sessionIds.length > 0) {
    const { data: sets, error: setsError } = await supabase
      .from("workout_sets")
      .select("session_id, weight, reps, completed_at, weight_unit")
      .in("session_id", sessionIds);

    if (setsError) throw setsError;

    weightUnit = (sets ?? []).find((setRow) => setRow.weight_unit)?.weight_unit ?? "lbs";

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
          {exercises.map((re) => {
            const ex = re.exercises!;
            const isDuration = ex.log_type === "duration";
            const targets = re.set_targets ?? [];
            const numSets = targets.length || re.default_sets;

            // Summarise reps/duration: show "N × val" if all targets equal, else just "N sets"
            let setsSummary = `${numSets} sets`;
            if (targets.length > 0) {
              const vals = targets.map((t) => t.reps);
              const allSame = vals.every((v) => v === vals[0]);
              if (allSame && vals[0]) {
                const val = vals[0];
                const display = isDuration
                  ? (Number(val) >= 60
                      ? `${Math.floor(Number(val) / 60)}:${String(Number(val) % 60).padStart(2, "0")}`
                      : `${val}s`)
                  : `${val} reps`;
                setsSummary = `${numSets} × ${display}`;
              }
            } else if (re.default_reps) {
              const display = isDuration
                ? (re.default_reps >= 60
                    ? `${Math.floor(re.default_reps / 60)}:${String(re.default_reps % 60).padStart(2, "0")}`
                    : `${re.default_reps}s`)
                : `${re.default_reps} reps`;
              setsSummary = `${numSets} × ${display}`;
            }

            return (
              <div key={ex.id} className="grid grid-cols-[1fr_auto] items-center gap-4 text-sm">
                <div className="min-w-0">
                  <span className="font-medium truncate block">{ex.name}</span>
                  <span className="text-muted-foreground text-xs capitalize">{ex.muscle_group}</span>
                </div>
                <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">{setsSummary}</span>
              </div>
            );
          })}
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
            <RoutineVolumeChart data={volumeBySession} weightUnit={weightUnit} />
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
          <CardContent>
            <SessionHistoryList sessions={sessions ?? []} />
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
