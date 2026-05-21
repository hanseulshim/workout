"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useWorkoutStore } from "@/store/workout-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Play, Dumbbell, Loader2 } from "lucide-react";
import type { LogType } from "@/types/database";

interface Routine {
  id: string;
  name: string;
}

interface RoutineWithExercises extends Routine {
  routine_exercises: Array<{
    exercise_id: string;
    position: number;
    default_sets: number;
    default_reps: number | null;
    set_targets: Array<{ reps: string }> | null;
    exercises: { id: string; name: string; log_type: string; gif_url: string | null } | null;
  }>;
}

interface Props {
  routines: Routine[];
  preselectedRoutine: RoutineWithExercises | null;
  userId: string;
}

export function WorkoutStartClient({ routines, preselectedRoutine, userId }: Props) {
  const router = useRouter();
  const { startWorkout, defaultWeightUnit } = useWorkoutStore();
  const [workoutName, setWorkoutName] = useState(
    preselectedRoutine ? preselectedRoutine.name : `Workout ${new Date().toLocaleDateString()}`
  );
  const [starting, setStarting] = useState(false);

  void userId;

  async function handleStart(routine?: RoutineWithExercises | null, name?: string) {
    setStarting(true);
    const supabase = createClient();
    const finalName = name ?? workoutName;

    const { data: session, error } = await supabase
      .from("workout_sessions")
      .insert({ user_id: userId, routine_id: routine?.id ?? null, name: finalName })
      .select()
      .single();

    if (error || !session) {
      toast.error("Failed to start workout");
      setStarting(false);
      return;
    }

    const exercises = (routine?.routine_exercises ?? [])
      .sort((a, b) => a.position - b.position)
      .map((re) => ({
        exerciseId: re.exercise_id,
        exerciseName: re.exercises?.name ?? "Unknown",
        gifUrl: re.exercises?.gif_url ?? null,
        logType: (re.exercises?.log_type ?? "weight_reps") as LogType,
        supersetId: re.superset_id ?? null,
        restSeconds: 90,
        sets: (re.set_targets ?? Array.from({ length: re.default_sets }, () => ({ reps: re.default_reps?.toString() ?? "" }))).map((st, i) => ({
          id: Math.random().toString(36).slice(2),
          setNumber: i + 1,
          reps: st.reps,
          weight: "",
          weightUnit: defaultWeightUnit,
          isBodyweight: false,
          durationSeconds: "",
          completed: false,
        })),
      }));

    startWorkout({
      sessionId: session.id,
      name: finalName,
      routineId: routine?.id ?? null,
      startedAt: session.started_at,
      exercises,
    });

    router.push(`/workout/${session.id}`);
  }

  // Auto-start immediately when a routine is preselected
  useEffect(() => {
    if (preselectedRoutine) {
      handleStart(preselectedRoutine, preselectedRoutine.name);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (preselectedRoutine) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground text-sm">Starting {preselectedRoutine.name}…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Start Workout</h1>

      <div className="space-y-2">
        <label className="text-sm font-medium">Workout Name</label>
        <Input value={workoutName} onChange={(e) => setWorkoutName(e.target.value)} placeholder="e.g. Push Day" />
      </div>

      <Button className="w-full h-14 text-base" onClick={() => handleStart(null)} disabled={starting || !workoutName.trim()}>
        <Play className="h-5 w-5 mr-2" />
        Start Empty Workout
      </Button>

      {routines.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Start from routine</h2>
          <div className="space-y-2">
            {routines.map((r) => (
              <Card key={r.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="flex items-center justify-between py-4 gap-2">
                  <button
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    onClick={() => router.push(`/routines/${r.id}`)}
                  >
                    <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{r.name}</span>
                  </button>
                  <button
                    onClick={() => router.push(`/workout/start?routine=${r.id}`)}
                    className="shrink-0 p-2 rounded-md hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-colors"
                    title="Start workout"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
