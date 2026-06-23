import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Pencil, Play, Calendar } from "lucide-react";
import { format } from "date-fns";
import { RoutineVolumeChart } from "@/components/routines/routine-volume-chart";
import { RoutineDeleteButton } from "@/components/routines/routine-delete-button";
import { SessionHistoryList } from "@/components/routines/session-history-list";
import { RoutineExportButton } from "@/components/routines/routine-export-button";
import type { RoutineExerciseRowLike } from "@/lib/routines/export-routine";
export const metadata = { title: "Routine | Workout" };


export default async function RoutineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: routine, error: routineError }, { data: sessions, error: sessionsError }] = await Promise.all([
    supabase
      .from("routines")
      .select(`id, name, days, routine_exercises(id, exercise_id, position, default_sets, default_reps, set_targets, superset_id, notes, rest_seconds, exercises(id, name, muscle_group, log_type))`)
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

  const normalizedExercises = (routine.routine_exercises as Array<{
    exercise_id: string;
    position: number;
    default_sets: number;
    default_reps: number | null;
    set_targets: Array<{ reps: string; weight?: string }> | null;
    superset_id: string | null;
    notes: string | null;
    rest_seconds: number | null;
    exercises?: { id: string; name: string; muscle_group: string; log_type: string } | { id: string; name: string; muscle_group: string; log_type: string }[] 
  }>)
    .map((exercise) => ({
      ...exercise,
      exercises: Array.isArray(exercise.exercises) ? exercise.exercises[0] ?? null : exercise.exercises,
    })) as Array<{
      exercise_id: string;
      position: number;
      default_sets: number;
      default_reps: number | null;
      set_targets: Array<{ reps: string; weight?: string }> | null;
      superset_id: string | null;
      notes: string | null;
      rest_seconds: number | null;
      exercises: { id: string; name: string; muscle_group: string; log_type: string } | null
    }>;

  const exercises = normalizedExercises
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
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link href="/routines" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 shrink-0")}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{routine.name}</h1>
            <p className="text-sm text-muted-foreground">{exercises.length} exercises</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <RoutineExportButton
            routineId={id}
            routineName={routine.name}
            days={routine.days}
            exercises={normalizedExercises as RoutineExerciseRowLike[]}
          />
          <RoutineDeleteButton routineId={id} />
          <Link
            href={`/routines/${id}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-8 w-8 sm:w-auto sm:px-3")}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden sm:inline ml-1.5">Edit</span>
          </Link>
          <Link
            href={`/workout/start?routine=${id}`}
            className={cn(buttonVariants({ size: "icon" }), "h-8 w-8 sm:w-auto sm:px-3")}
          >
            <Play className="h-3.5 w-3.5" />
            <span className="hidden sm:inline ml-1.5">Start</span>
          </Link>
        </div>
      </div>

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

      {/* Exercise list */}
      {exercises.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Exercises ({exercises.length})
          </h2>
          <div className="space-y-3">
            {exercises.map((re) => {
              const ex = re.exercises!;
              const isDuration = ex.log_type === "duration";
              const showWeight = ["weight_reps", "weighted_bodyweight", "assisted_bodyweight"].includes(ex.log_type);
              const weightLabel = ex.log_type === "weighted_bodyweight" ? "+Weight" : ex.log_type === "assisted_bodyweight" ? "Assist" : "Weight";
              const colClass = showWeight ? "grid-cols-[2rem_1fr_1fr]" : "grid-cols-[2rem_1fr]";

              const targets = re.set_targets ?? [];
              const numSets = targets.length || re.default_sets;

              const rows: { weight?: string; reps: string }[] = targets.length > 0
                ? targets.map((t: { reps: string; weight?: string }) => ({ weight: t.weight, reps: t.reps }))
                : Array.from({ length: numSets }, () => ({
                    weight: undefined,
                    reps: re.default_reps != null ? String(re.default_reps) : "",
                  }));

              const formatReps = (val: string) => {
                if (!isDuration || !val) return val || "—";
                const s = Number(val);
                return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}s`;
              };

              return (
                <Link key={ex.id} href={`/progress/${ex.id}`} className="block group/card">
                  <Card className="transition-colors group-hover/card:bg-muted/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base truncate">{ex.name}</CardTitle>
                        <span className="text-xs text-muted-foreground shrink-0">{rows.length} sets</span>
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">{ex.muscle_group}</p>
                      {re.notes && (
                        <p className="mt-1.5 text-xs text-muted-foreground italic bg-muted/40 rounded-md px-2.5 py-1.5 border border-border/40 whitespace-pre-wrap">
                          {re.notes}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0 space-y-1.5">
                      <div className={`grid ${colClass} gap-2 px-1`}>
                        <span className="text-xs text-muted-foreground text-center">Set</span>
                        {showWeight && <span className="text-xs text-muted-foreground text-center">{weightLabel}</span>}
                        <span className="text-xs text-muted-foreground text-center">{isDuration ? "Duration" : "Reps"}</span>
                      </div>
                      {rows.map((row, i) => (
                        <div key={i} className={`grid ${colClass} gap-2 items-center`}>
                          <span className="text-xs font-medium text-center text-muted-foreground">{i + 1}</span>
                          {showWeight && (
                            <span className="h-8 flex items-center justify-center text-sm border rounded-md bg-background">
                              {row.weight ?? "—"}
                            </span>
                          )}
                          <span className="h-8 flex items-center justify-center text-sm border rounded-md bg-background tabular-nums">
                            {formatReps(row.reps)}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
