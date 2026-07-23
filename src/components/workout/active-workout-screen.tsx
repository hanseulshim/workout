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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import {
  useWorkoutStore,
  type ActiveExercise,
  type ActiveSet,
  type RestTimerState,
} from "@/store/workout-store";
import { keepAudioAlive, playRestChime, unlockAudio } from "@/lib/audio";
import type { Exercise, LogType } from "@/types/database";

function nowMs() {
  return Date.now();
}

function getRemainingSeconds(restTimer: RestTimerState, now: number | null) {
  if (!restTimer.active) return 0;
  if (restTimer.paused || restTimer.endsAt === null || now === null) return restTimer.seconds;
  return Math.max(0, Math.ceil((restTimer.endsAt - now) / 1000));
}

interface ActiveWorkoutScreenProps {
  sessionId?: string;
}

export function ActiveWorkoutScreen({ sessionId }: ActiveWorkoutScreenProps) {
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
    startWorkout,
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
    newPr,
    clearPr,
    workoutPaused,
    totalPausedMs,
    pauseWorkout,
    resumeWorkout,
  } = useWorkoutStore();

  const [finishing, setFinishing] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [userId, setUserId] = useState("");
  const [now, setNow] = useState<number | null>(null);
  const [invalidSetIds, setInvalidSetIds] = useState<Set<string>>(new Set());
  const restTimerPausedByWorkout = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      setLoadingSession(false);
      return;
    }
    if (activeWorkout && activeWorkout.sessionId === sessionId) {
      setLoadingSession(false);
      return;
    }

    let cancelled = false;
    async function hydrateSession() {
      setLoadingSession(true);
      const supabase = createClient();
      const { data: session } = await supabase
        .from("workout_sessions")
        .select("id, name, routine_id, started_at, finished_at")
        .eq("id", sessionId)
        .maybeSingle();

      if (cancelled) return;

      if (!session || session.finished_at !== null) {
        if (activeWorkout?.sessionId === sessionId) {
          endWorkout();
        }
        setLoadingSession(false);
        return;
      }

      // Fetch routine exercises if attached to a routine
      let routineExercises: Array<{
        id: string;
        exercise_id: string;
        position: number;
        default_sets: number;
        default_reps: number | null;
        set_targets: Array<{ reps: string; weight?: string }> | null;
        superset_id: string | null;
        rest_seconds: number | null;
        notes: string | null;
        exercises: { id: string; name: string; log_type: string; gif_url: string | null } | null;
      }> = [];

      if (session.routine_id) {
        const { data: routineData } = await supabase
          .from("routines")
          .select(`routine_exercises(id, exercise_id, position, default_sets, default_reps, set_targets, superset_id, rest_seconds, notes, exercises(id, name, log_type, gif_url))`)
          .eq("id", session.routine_id)
          .maybeSingle();

        if (routineData?.routine_exercises) {
          routineExercises = (routineData.routine_exercises as unknown as typeof routineExercises).map((ex) => ({
            ...ex,
            exercises: Array.isArray(ex.exercises) ? ex.exercises[0] ?? null : ex.exercises,
          }));
        }
      }

      const { data: loggedSetsRaw } = await supabase
        .from("workout_sets")
        .select("id, exercise_id, set_number, reps, weight, weight_unit, is_bodyweight, duration_seconds, rest_seconds, completed_at")
        .eq("session_id", session.id)
        .order("set_number");

      if (cancelled) return;

      type LoggedSet = {
        id: string;
        exercise_id: string;
        set_number: number;
        reps: number | null;
        weight: number | null;
        weight_unit: "kg" | "lbs";
        is_bodyweight: boolean;
        duration_seconds: number | null;
      };
      const loggedSets = (loggedSetsRaw ?? []) as LoggedSet[];

      const routineExIds = new Set(routineExercises.map((re) => re.exercise_id));
      const extraExIds = Array.from(new Set(loggedSets.map((s) => s.exercise_id))).filter((id) => !routineExIds.has(id));

      const extraExercisesMap = new Map<string, { id: string; name: string; log_type: string; gif_url: string | null }>();
      if (extraExIds.length > 0) {
        const { data: extraExData } = await supabase
          .from("exercises")
          .select("id, name, log_type, gif_url")
          .in("id", extraExIds);
        (extraExData ?? []).forEach((ex) => extraExercisesMap.set(ex.id, ex));
      }

      const activeExercises: ActiveExercise[] = [];

      routineExercises
        .sort((a, b) => a.position - b.position)
        .forEach((re) => {
          const exMeta = re.exercises;
          const logType = (exMeta?.log_type ?? "weight_reps") as LogType;
          const setTemplates: Array<{ reps: string; weight?: string }> = re.set_targets ?? Array.from({ length: re.default_sets }, () => ({ reps: re.default_reps?.toString() ?? "", weight: "" }));
          const isDuration = logType === "duration";
          const exLoggedSets = loggedSets.filter((s) => s.exercise_id === re.exercise_id);

          const sets: ActiveSet[] = setTemplates.map((setTemplate, index) => {
            const logged = exLoggedSets.find((s) => s.set_number === index + 1);
            return {
              id: logged?.id ?? Math.random().toString(36).slice(2),
              setNumber: index + 1,
              reps: logged ? (logged.reps?.toString() ?? "") : (isDuration ? (setTemplate.reps ?? "") : (setTemplate.reps ?? "")),
              weight: logged ? (logged.weight?.toString() ?? "") : (setTemplate.weight ?? ""),
              weightUnit: logged ? logged.weight_unit : defaultWeightUnit,
              isBodyweight: ["bodyweight_reps", "weighted_bodyweight", "assisted_bodyweight"].includes(logType),
              durationSeconds: logged ? (logged.duration_seconds?.toString() ?? "") : (isDuration ? (setTemplate.reps ?? "") : ""),
              completed: Boolean(logged),
            };
          });

          if (exLoggedSets.length > setTemplates.length) {
            exLoggedSets.slice(setTemplates.length).forEach((logged) => {
              sets.push({
                id: logged.id,
                setNumber: logged.set_number,
                reps: logged.reps?.toString() ?? "",
                weight: logged.weight?.toString() ?? "",
                weightUnit: logged.weight_unit,
                isBodyweight: ["bodyweight_reps", "weighted_bodyweight", "assisted_bodyweight"].includes(logType),
                durationSeconds: logged.duration_seconds?.toString() ?? "",
                completed: true,
              });
            });
          }

          activeExercises.push({
            exerciseId: re.exercise_id,
            exerciseName: exMeta?.name ?? "Unknown",
            gifUrl: exMeta?.gif_url ?? null,
            logType,
            supersetId: re.superset_id ?? null,
            restSeconds: re.rest_seconds ?? 90,
            notes: re.notes ?? "",
            bestWeight: null,
            bestReps: null,
            bestDuration: null,
            sets,
          });
        });

      extraExIds.forEach((exId) => {
        const exMeta = extraExercisesMap.get(exId);
        const exLoggedSets = loggedSets.filter((s) => s.exercise_id === exId);
        const logType = (exMeta?.log_type ?? "weight_reps") as LogType;

        activeExercises.push({
          exerciseId: exId,
          exerciseName: exMeta?.name ?? "Unknown",
          gifUrl: exMeta?.gif_url ?? null,
          logType,
          supersetId: null,
          restSeconds: 90,
          notes: "",
          bestWeight: null,
          bestReps: null,
          bestDuration: null,
          sets: exLoggedSets.map((logged) => ({
            id: logged.id,
            setNumber: logged.set_number,
            reps: logged.reps?.toString() ?? "",
            weight: logged.weight?.toString() ?? "",
            weightUnit: logged.weight_unit,
            isBodyweight: ["bodyweight_reps", "weighted_bodyweight", "assisted_bodyweight"].includes(logType),
            durationSeconds: logged.duration_seconds?.toString() ?? "",
            completed: true,
          })),
        });
      });

      startWorkout({
        sessionId: session.id,
        name: session.name,
        routineId: session.routine_id ?? null,
        startedAt: session.started_at,
        exercises: activeExercises,
      });

      setLoadingSession(false);
    }

    void hydrateSession();
    return () => {
      cancelled = true;
    };
  }, [sessionId, activeWorkout?.sessionId, defaultWeightUnit, startWorkout, endWorkout]);

  // Unlock the Web Audio API on every user gesture so iOS Safari/PWA keeps
  // the AudioContext running. iOS can close the context when backgrounded, so
  // listeners stay active (not removed after first use) and we also try to
  // re-unlock when the app returns to the foreground.
  useEffect(() => {
    function handleGesture() {
      unlockAudio();
    }
    document.addEventListener("pointerdown", handleGesture, { passive: true });
    document.addEventListener("touchstart", handleGesture, { passive: true });
    document.addEventListener("mousedown", handleGesture, { passive: true });
    document.addEventListener("keydown", handleGesture);

    function handleVisibilityChange() {
      if (!document.hidden) {
        unlockAudio();
        setNow(Date.now()); // snap stale timer to current time on foreground return
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("pointerdown", handleGesture);
      document.removeEventListener("touchstart", handleGesture);
      document.removeEventListener("mousedown", handleGesture);
      document.removeEventListener("keydown", handleGesture);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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
    const interval = window.setInterval(() => {
      const currentTime = nowMs();
      setNow(currentTime);

      // Keep audio context alive during active rest timer (every 10 seconds)
      if (restTimer.active && !restTimer.paused && restTimer.endsAt !== null) {
        const remaining = Math.max(0, Math.ceil((restTimer.endsAt - currentTime) / 1000));
        if (remaining > 0 && remaining % 10 === 0) {
          keepAudioAlive();
        }
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [needsTick, restTimer.active, restTimer.paused, restTimer.endsAt]);

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

  if (loadingSession) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading active workout…</p>
      </div>
    );
  }

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

  function handleTimerToggle() {
    // User is manually toggling the rest timer — clear the auto-pause flag
    // so that resuming the workout doesn't force-resume it.
    restTimerPausedByWorkout.current = false;
    pauseRestTimer();
  }

  function handlePauseToggle() {
    if (!workoutPaused) {
      pauseWorkout();
      if (restTimer.active && !restTimer.paused) {
        restTimerPausedByWorkout.current = true;
        pauseRestTimer();
      }
    } else {
      resumeWorkout();
      // Only auto-resume the rest timer if the workout was the one that paused it
      // and the user hasn't manually toggled it since.
      if (restTimerPausedByWorkout.current) {
        restTimerPausedByWorkout.current = false;
        if (restTimer.paused) {
          pauseRestTimer();
        }
        // If the timer is already running (user manually resumed it), leave it alone.
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
    if (!currentWorkout?.sessionId) {
      endWorkout();
      router.push("/");
      return;
    }
    try {
      await discardActiveWorkout(currentWorkout.sessionId);
    } catch (error) {
      console.error("Failed to discard session in DB:", error);
    } finally {
      endWorkout();
      router.push("/");
    }
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
      <AlertDialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard workout?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to discard this active workout? This will delete all sets and progress from this session. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDiscard}
            >
              Discard Workout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="pb-4">
        <div className="sticky top-0 z-20 bg-background border-b border-border/40 shadow-sm px-4 py-3 md:px-8 space-y-3">
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
            onDiscard={() => setDiscardConfirmOpen(true)}
            onFinishClick={() => setFinishConfirmOpen(true)}
            onPauseToggle={handlePauseToggle}
            onMinimize={() => router.push("/")}
          />
          {restTimer.active && (
            <ActiveWorkoutRestTimer
              remainingSeconds={remainingSeconds}
              paused={restTimer.paused}
              onTogglePause={handleTimerToggle}
              onStop={stopRestTimer}
            />
          )}
        </div>
        <div className="mt-4 px-4 md:px-8">
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
      </div>
    </>
  );
}
