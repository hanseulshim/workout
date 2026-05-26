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
        <CardContent className="divide-y">
          {exercises.map((re) => {
            const ex = re.exercises!;
            const isDuration = ex.log_type === "duration";
            const targets = re.set_targets ?? [];
            const numSets = targets.length || re.default_sets;

            const formatVal = (val: string) => {
              if (isDuration) {
                const s = Number(val);
                return s >= 60
                  ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
                  : `${s}s`;
              }
              return val;
            };

            // Build per-set chips: "20 lbs × 8" or "8" or "1:30"
            const chips: string[] = targets.length > 0
              ? targets.map((t) => {
                  const weight = (t as { reps: string; weight?: string }).weight;
                  const val = formatVal(t.reps);
                  return weight ? `${weight} × ${val}` : val;
                })
              : re.default_reps
                ? Array(numSets).fill(formatVal(String(re.default_reps)))
                : [];

            // Collapse identical chips → "3 × 8" style label
            const allSame = chips.length > 0 && chips.every((c) => c === chips[0]);
            const label = allSame
              ? `${chips.length} × ${chips[0]}`
              : null;

            return (
              <Link
                key={ex.id}
                href={`/progress/${ex.id}`}
                className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/50 -mx-2 px-2 transition-colors first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <span className="font-medium truncate block">{ex.name}</span>
                  <span className="text-muted-foreground text-xs capitalize">{ex.muscle_group}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {label ? (
                    <span className="rounded bg-muted px-2 py-0.5 text-xs tabular-nums">{label}</span>
                  ) : chips.length > 0 ? (
                    chips.map((chip, i) => (
                      <span key={i} className="rounded bg-muted px-2 py-0.5 text-xs tabular-nums">{chip}</span>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-xs">{numSets} sets</span>
                  )}
                </div>
              </Link>
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
