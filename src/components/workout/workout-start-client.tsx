"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useWorkoutStore } from "@/store/workout-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Play, Dumbbell } from "lucide-react";
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

  async function handleStart(routine?: RoutineWithExercises | null) {
    setStarting(true);
    const supabase = createClient();

    // Create the session in DB
    const { data: session, error } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: userId,
        routine_id: routine?.id ?? null,
        name: workoutName,
      })
      .select()
      .single();

    if (error || !session) {
      toast.error("Failed to start workout");
      setStarting(false);
      return;
    }

    // Build exercises from routine or empty
    const exercises = (routine?.routine_exercises ?? [])
      .sort((a, b) => a.position - b.position)
      .map((re) => ({
        exerciseId: re.exercise_id,
        exerciseName: re.exercises?.name ?? "Unknown",
        gifUrl: re.exercises?.gif_url ?? null,
        logType: (re.exercises?.log_type ?? "weight_reps") as LogType,
        supersetId: null,
        sets: Array.from({ length: re.default_sets }, (_, i) => ({
          id: Math.random().toString(36).slice(2),
          setNumber: i + 1,
          reps: re.default_reps?.toString() ?? "",
          weight: "",
          weightUnit: defaultWeightUnit,
          isBodyweight: false,
          durationSeconds: "",
          completed: false,
        })),
      }));

    startWorkout({
      sessionId: session.id,
      name: workoutName,
      routineId: routine?.id ?? null,
      startedAt: session.started_at,
      exercises,
    });

    router.push(`/workout/${session.id}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Start Workout</h1>

      <div className="space-y-2">
        <label className="text-sm font-medium">Workout Name</label>
        <Input
          value={workoutName}
          onChange={(e) => setWorkoutName(e.target.value)}
          placeholder="e.g. Push Day"
        />
      </div>

      <Button
        className="w-full h-14 text-base"
        onClick={() => handleStart(preselectedRoutine)}
        disabled={starting || !workoutName.trim()}
      >
        <Play className="h-5 w-5 mr-2" />
        {preselectedRoutine ? `Start "${preselectedRoutine.name}"` : "Start Empty Workout"}
      </Button>

      {routines.length > 0 && !preselectedRoutine && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Or pick a routine
          </h2>
          <div className="space-y-2">
            {routines.map((r) => (
              <Card key={r.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent
                  className="flex items-center justify-between py-4"
                  onClick={() => {
                    setWorkoutName(r.name);
                    router.push(`/workout/start?routine=${r.id}`);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Dumbbell className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{r.name}</span>
                  </div>
                  <Play className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
