"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Dumbbell, Play } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useWorkoutStore } from "@/store/workout-store";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { LogType } from "@/types/database";

interface LastSet {
  exercise_id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  weight_unit: string;
  duration_seconds: number | null;
}

interface Routine {
  id: string;
  name: string;
  days: number[];
}

interface RoutineWithExercises extends Routine {
  routine_exercises: Array<{
    exercise_id: string;
    position: number;
    default_sets: number;
    default_reps: number | null;
    set_targets: Array<{ reps: string; weight?: string }> | null;
    superset_id: string | null;
    rest_seconds: number | null;
    notes: string | null;
    exercises: { id: string; name: string; log_type: string; gif_url: string | null } | null;
  }>;
}

interface PersonalBest {
  weight: number | null;
  reps: number | null;
  duration: number | null;
}

interface Props {
  routines: Routine[];
  preselectedRoutine: RoutineWithExercises | null;
  userId: string;
  lastSets: LastSet[];
  personalBests: Record<string, PersonalBest>;
}

export function WorkoutStartClient({ routines, preselectedRoutine, userId, lastSets, personalBests }: Props) {
  const router = useRouter();
  const { startWorkout, defaultWeightUnit, activeWorkout, endWorkout } = useWorkoutStore();
  const [workoutName, setWorkoutName] = useState(
    preselectedRoutine ? preselectedRoutine.name : `Workout ${new Date().toLocaleDateString()}`,
  );
  const [starting, setStarting] = useState(false);
  const [manualRoutineWarning, setManualRoutineWarning] = useState<string | null>(null);
  const [conflictPending, setConflictPending] = useState<{ routine: RoutineWithExercises | null; name?: string } | null>(null);
  const startedRef = useRef(false);

  const emptyRoutineMessage = "This routine has no exercises. Add exercises before starting.";
  const emptyPreselectedRoutine = Boolean(preselectedRoutine && preselectedRoutine.routine_exercises.length === 0);
  const routineWarning = emptyPreselectedRoutine ? emptyRoutineMessage : manualRoutineWarning;

  async function discardActiveAndStart(routine: RoutineWithExercises | null, name?: string) {
    if (activeWorkout?.sessionId) {
      const supabase = createClient();
      await supabase.from("workout_sessions").delete().eq("id", activeWorkout.sessionId);
    }

    endWorkout();
    setConflictPending(null);
    await handleStart(routine, name);
  }

  async function handleStart(routine?: RoutineWithExercises | null, name?: string) {
    if (routine && routine.routine_exercises.length === 0) {
      setManualRoutineWarning(emptyRoutineMessage);
      toast.error(emptyRoutineMessage);
      return;
    }

    setManualRoutineWarning(null);

    if (activeWorkout?.sessionId && activeWorkout.routineId !== (routine?.id ?? null)) {
      setConflictPending({ routine: routine ?? null, name });
      return;
    }

    setStarting(true);
    const supabase = createClient();
    const finalName = name ?? workoutName;
    const startedAfter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    let existingQuery = supabase
      .from("workout_sessions")
      .select("id")
      .eq("user_id", userId)
      .is("finished_at", null)
      .gte("started_at", startedAfter);

    existingQuery = routine?.id ? existingQuery.eq("routine_id", routine.id) : existingQuery.is("routine_id", null);

    const { data: existing, error: existingError } = await existingQuery.maybeSingle();
    if (existingError) {
      toast.error("Failed to start workout");
      setStarting(false);
      return;
    }

    if (existing) {
      router.push(`/workout/${existing.id}`);
      setStarting(false);
      return;
    }

    const { data: session, error } = await supabase
      .from("workout_sessions")
      .insert({ user_id: userId, routine_id: routine?.id ?? null, name: finalName })
      .select("id, started_at")
      .single();

    if (error || !session) {
      toast.error("Failed to start workout");
      setStarting(false);
      return;
    }

    const exercises = (routine?.routine_exercises ?? [])
      .slice()
      .sort((left, right) => left.position - right.position)
      .map((routineExercise) => {
        const previousSets = lastSets
          .filter((setItem) => setItem.exercise_id === routineExercise.exercise_id)
          .sort((left, right) => left.set_number - right.set_number);

        const logType = (routineExercise.exercises?.log_type ?? "weight_reps") as LogType;
        const setTemplates: Array<{ reps: string; weight?: string }> = routineExercise.set_targets
          ?? Array.from({ length: routineExercise.default_sets }, () => ({ reps: routineExercise.default_reps?.toString() ?? "" }));
        const best = personalBests[routineExercise.exercise_id] ?? { weight: null, reps: null, duration: null };
        const isDuration = logType === "duration";

        return {
          exerciseId: routineExercise.exercise_id,
          exerciseName: routineExercise.exercises?.name ?? "Unknown",
          gifUrl: routineExercise.exercises?.gif_url ?? null,
          logType,
          supersetId: routineExercise.superset_id ?? null,
          restSeconds: routineExercise.rest_seconds ?? 90,
          notes: routineExercise.notes ?? "",
          bestWeight: best.weight,
          bestReps: best.reps,
          bestDuration: best.duration,
          sets: setTemplates.map((setTemplate, index) => {
            const previousSet = index >= 0 && index < previousSets.length ? previousSets[index] : undefined;
            return {
              id: Math.random().toString(36).slice(2),
              setNumber: index + 1,
              reps: isDuration
                ? (setTemplate.reps ?? previousSet?.duration_seconds?.toString() ?? "")
                : (setTemplate.reps || previousSet?.reps?.toString() ?? ""),
              weight: (setTemplate.weight || previousSet?.weight?.toString() ?? ""),
              weightUnit: previousSet?.weight_unit === "kg" || previousSet?.weight_unit === "lbs"
                ? previousSet.weight_unit
                : defaultWeightUnit,
              isBodyweight: ["bodyweight_reps", "weighted_bodyweight", "assisted_bodyweight"].includes(logType),
              durationSeconds: isDuration
                ? (setTemplate.reps ?? previousSet?.duration_seconds?.toString() ?? "")
                : "",
              completed: false,
            };
          }),
        };
      });

    startWorkout({
      sessionId: session.id,
      name: finalName,
      routineId: routine?.id ?? null,
      startedAt: session.started_at,
      exercises,
    });

    router.push(`/workout/${session.id}`);
  }

  useEffect(() => {
    if (!preselectedRoutine || startedRef.current) return;

    startedRef.current = true;
    if (emptyPreselectedRoutine) {
      return;
    }

    if (activeWorkout?.sessionId && activeWorkout.routineId === preselectedRoutine.id) {
      router.push(`/workout/${activeWorkout.sessionId}`);
      return;
    }

    void handleStart(preselectedRoutine, preselectedRoutine.name);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (preselectedRoutine && !conflictPending && !emptyPreselectedRoutine) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Starting {preselectedRoutine.name}…</p>
      </div>
    );
  }

  return (
    <>
      <AlertDialog
        open={!!conflictPending}
        onOpenChange={(open) => {
          if (!open) {
            setConflictPending(null);
            if (preselectedRoutine) router.back();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Workout already in progress</AlertDialogTitle>
            <AlertDialogDescription>
              You have <strong>{activeWorkout?.name}</strong> in progress. Discard it to start a new workout?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => conflictPending && discardActiveAndStart(conflictPending.routine, conflictPending.name)}
            >
              Discard &amp; start new
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Start Workout</h1>

        {routineWarning && (
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-100">
            {routineWarning}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Workout Name</label>
          <Input value={workoutName} onChange={(event) => setWorkoutName(event.target.value)} placeholder="e.g. Push Day" />
        </div>

        <Button className="h-14 w-full text-base" onClick={() => handleStart(null)} disabled={starting || !workoutName.trim()}>
          <Play className="mr-2 h-5 w-5" />
          Start Empty Workout
        </Button>

        {routines.length > 0 && (() => {
          const today = new Date().getDay();
          const todayRoutines = routines.filter((r) => r.days.includes(today));
          const otherRoutines = routines.filter((r) => !r.days.includes(today));

          function RoutineRow({ routine }: { routine: Routine }) {
            return (
              <Card key={routine.id} className="transition-colors hover:bg-muted/30">
                <CardContent className="flex items-center justify-between gap-2 py-4">
                  <button
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => router.push(`/routines/${routine.id}`)}
                  >
                    <Dumbbell className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium">{routine.name}</span>
                  </button>
                  <button
                    onClick={() => router.push(`/workout/start?routine=${routine.id}`)}
                    className="min-h-[44px] min-w-[44px] shrink-0 rounded-md text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                    title="Start workout"
                    aria-label={`Start ${routine.name}`}
                  >
                    <Play className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            );
          }

          return (
            <div className="space-y-4">
              {todayRoutines.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Today</h2>
                  {todayRoutines.map((routine) => (
                    <Card key={routine.id} className="border-primary/40 bg-primary/5 transition-colors hover:bg-primary/10">
                      <CardContent className="flex items-center justify-between gap-2 py-4">
                        <button
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          onClick={() => router.push(`/routines/${routine.id}`)}
                        >
                          <Dumbbell className="h-4 w-4 shrink-0 text-primary" />
                          <span className="truncate font-medium">{routine.name}</span>
                        </button>
                        <button
                          onClick={() => router.push(`/workout/start?routine=${routine.id}`)}
                          className="min-h-[44px] min-w-[44px] shrink-0 rounded-md text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                          title="Start workout"
                          aria-label={`Start ${routine.name}`}
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {otherRoutines.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {todayRoutines.length > 0 ? "Other Routines" : "Start from routine"}
                  </h2>
                  {otherRoutines.map((routine) => <RoutineRow key={routine.id} routine={routine} />)}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </>
  );
}
