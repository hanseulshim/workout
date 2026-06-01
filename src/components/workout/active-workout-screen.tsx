"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AddExerciseSheet } from "@/components/workout/add-exercise-sheet";
import { ActiveWorkoutExerciseGroups } from "@/components/workout/active-workout-exercise-groups";
import { ActiveWorkoutHeader } from "@/components/workout/active-workout-header";
import { ActiveWorkoutRestTimer } from "@/components/workout/active-workout-rest-timer";
import {
  discardActiveWorkout,
  saveActiveWorkout,
} from "@/components/workout/active-workout-session-actions";
import { FinishWorkoutDialog } from "@/components/workout/finish-workout-dialog";
import {
  useWorkoutStore,
  type ActiveSet,
  type RestTimerState,
} from "@/store/workout-store";
import { playRestChime } from "@/lib/audio";
import type { Exercise, WeightUnit } from "@/types/database";

function nowMs() {
  return Date.now();
}

function getRemainingSeconds(restTimer: RestTimerState, now: number | null) {
  if (!restTimer.active) return 0;
  if (restTimer.paused || restTimer.endsAt === null || now === null) return restTimer.seconds;
  return Math.max(0, Math.ceil((restTimer.endsAt - now) / 1000));
}

export function ActiveWorkoutScreen() {
  const router = useRouter();
  const {
    activeWorkout,
    addExercise,
    removeExercise,
    addSet,
    removeSet,
    updateSet,
    toggleSetComplete,
    reorderExercises,
    endWorkout,
    restTimer,
    stopRestTimer,
    pauseRestTimer,
    startRestTimer,
    linkSuperset,
    unlinkSuperset,
    setExerciseRestTime,
    setExerciseNotes,
    defaultWeightUnit,
    convertWeightUnit,
    newPr,
    clearPr,
  } = useWorkoutStore();

  const [finishing, setFinishing] = useState(false);
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [userId, setUserId] = useState("");
  const [now, setNow] = useState<number | null>(null);
  const [invalidSetIds, setInvalidSetIds] = useState<Set<string>>(new Set());
  const [workoutPaused, setWorkoutPaused] = useState(false);
  const [totalPausedMs, setTotalPausedMs] = useState(0);
  const pausedAtRef = useRef<number | null>(null);
  const restTimerPausedByWorkout = useRef(false);

  useEffect(() => {
    async function loadExercises() {
      const supabase = createClient();
      const [{ data }, { data: { user } }] = await Promise.all([
        supabase
          .from("exercises")
          .select("id, name, muscle_group, category, equipment_type, log_type, gif_url, is_custom, user_id, created_at")
          .order("name"),
        supabase.auth.getUser(),
      ]);
      setExercises(data ?? []);
      setUserId(user?.id ?? "");
    }

    void loadExercises();
  }, []);

  const remainingSeconds = useMemo(() => getRemainingSeconds(restTimer, now), [now, restTimer]);

  const needsTick = !workoutPaused || (restTimer.active && !restTimer.paused);
  useEffect(() => {
    if (!needsTick) return undefined;
    const interval = window.setInterval(() => setNow(nowMs()), 1000);
    return () => window.clearInterval(interval);
  }, [needsTick]);

  useEffect(() => {
    if (!restTimer.active || restTimer.paused || remainingSeconds > 0) return;
    stopRestTimer();
    playRestChime();
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
    toast.info("Rest over! Time for your next set.", { duration: 3000 });
  }, [remainingSeconds, restTimer.active, restTimer.paused, stopRestTimer]);

  useEffect(() => {
    if (!newPr) return;
    toast.success(`🏆 New PR! ${newPr.exerciseName}: ${newPr.value}`);
    clearPr();
  }, [newPr, clearPr]);

  if (!activeWorkout) {
    return (
      <div className="space-y-4 py-20 text-center">
        <p className="text-muted-foreground">No active workout.</p>
        <Button onClick={() => router.push("/workout/start")}>Start a Workout</Button>
      </div>
    );
  }

  const totalSets = activeWorkout.exercises.reduce((count, exercise) => count + exercise.sets.length, 0);
  const completedSets = activeWorkout.exercises.reduce(
    (count, exercise) => count + exercise.sets.filter((setItem) => setItem.completed).length,
    0,
  );
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  function handleAddExercise(selectedExercises: Exercise[]) {
    selectedExercises.forEach((exercise) => {
      addExercise({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        gifUrl: exercise.gif_url ?? null,
        logType: exercise.log_type,
        supersetId: null,
        restSeconds: 90,
        notes: "",
        bestWeight: null,
        bestReps: null,
        bestDuration: null,
        sets: [{
          id: Math.random().toString(36).slice(2),
          setNumber: 1,
          reps: "",
          weight: "",
          weightUnit: defaultWeightUnit,
          isBodyweight: ["bodyweight_reps", "weighted_bodyweight", "assisted_bodyweight"].includes(exercise.log_type),
          durationSeconds: "",
          completed: false,
        }],
      });
    });

    setAddExerciseOpen(false);
    toast.success(
      selectedExercises.length === 1
        ? `${selectedExercises[0].name} added`
        : `${selectedExercises.length} exercises added`,
    );
  }

  function handleSetUpdate(exerciseId: string, setId: string, updates: Partial<ActiveSet>) {
    setInvalidSetIds((prev) => {
      if (!prev.has(setId)) return prev;
      const next = new Set(prev);
      next.delete(setId);
      return next;
    });
    updateSet(exerciseId, setId, updates);
  }

  function handleToggleSetComplete(exerciseId: string, setId: string) {
    if (toggleSetComplete(exerciseId, setId)) {
      setInvalidSetIds((prev) => {
        if (!prev.has(setId)) return prev;
        const next = new Set(prev);
        next.delete(setId);
        return next;
      });
      return;
    }

    setInvalidSetIds((prev) => new Set(prev).add(setId));
    toast.error("Enter valid set values before marking it complete.");
  }

  function handleWeightUnitToggle(unit: WeightUnit) {
    if (unit !== defaultWeightUnit) convertWeightUnit(unit);
  }

  function handlePauseToggle() {
    if (!workoutPaused) {
      pausedAtRef.current = Date.now();
      setWorkoutPaused(true);
      if (restTimer.active && !restTimer.paused) {
        restTimerPausedByWorkout.current = true;
        pauseRestTimer();
      }
    } else {
      if (pausedAtRef.current !== null) {
        setTotalPausedMs((prev) => prev + (Date.now() - pausedAtRef.current!));
        pausedAtRef.current = null;
      }
      setWorkoutPaused(false);
      if (restTimerPausedByWorkout.current && restTimer.active && restTimer.paused) {
        restTimerPausedByWorkout.current = false;
        pauseRestTimer();
      }
    }
  }

  async function handleFinish() {
    const currentWorkout = activeWorkout;
    if (!currentWorkout?.sessionId) return;
    setFinishing(true);

    try {
      const finishedAt = new Date().toISOString();
      const { routineSyncWarning } = await saveActiveWorkout(currentWorkout, finishedAt);
      if (routineSyncWarning) {
        toast.info("Workout saved, but routine defaults could not be fully updated.");
      }
      endWorkout();
      toast.success("Workout saved! 💪");
      router.refresh();
      router.push("/history");
      setFinishConfirmOpen(false);
    } catch (error) {
      console.error("handleFinish error:", error);
      toast.error("Failed to save workout. Please try again.");
      setFinishing(false);
    }
  }

  async function handleDiscard() {
    const currentWorkout = activeWorkout;
    if (!currentWorkout?.sessionId) return;
    await discardActiveWorkout(currentWorkout.sessionId);
    endWorkout();
    router.push("/");
  }

  return (
    <>
      <FinishWorkoutDialog
        open={finishConfirmOpen}
        onOpenChange={setFinishConfirmOpen}
        completedSets={completedSets}
        finishing={finishing}
        onConfirm={handleFinish}
      />
      <div className="pb-4">
        <div className="sticky top-0 z-10 bg-background -mx-4 px-4 pt-4 pb-3 md:-mx-8 md:px-8 border-b border-border/40 mb-3 space-y-3">
          <ActiveWorkoutHeader
            name={activeWorkout.name}
            startedAt={activeWorkout.startedAt}
            now={now}
            totalPausedMs={totalPausedMs}
            paused={workoutPaused}
            finishing={finishing}
            completedSets={completedSets}
            totalSets={totalSets}
            progress={progress}
            onDiscard={handleDiscard}
            onFinishClick={() => setFinishConfirmOpen(true)}
            onPauseToggle={handlePauseToggle}
          />
          {restTimer.active && (
            <ActiveWorkoutRestTimer
              remainingSeconds={remainingSeconds}
              paused={restTimer.paused}
              onTogglePause={pauseRestTimer}
              onStop={stopRestTimer}
            />
          )}
        </div>
        <ActiveWorkoutExerciseGroups
          exercises={activeWorkout.exercises}
          invalidSetIds={invalidSetIds}
          onAddSet={addSet}
          onRemoveSet={removeSet}
          onUpdateSet={handleSetUpdate}
          onToggleComplete={handleToggleSetComplete}
          onRemoveExercise={removeExercise}
          onSetRestTime={setExerciseRestTime}
          onStartRest={startRestTimer}
          onSetNotes={setExerciseNotes}
          onLinkSuperset={linkSuperset}
          onUnlinkSuperset={unlinkSuperset}
          onReorderExercises={reorderExercises}
        />
        <AddExerciseSheet
          open={addExerciseOpen}
          onOpenChange={setAddExerciseOpen}
          exercises={exercises}
          userId={userId}
          onSelect={handleAddExercise}
        />
      </div>
    </>
  );
}
