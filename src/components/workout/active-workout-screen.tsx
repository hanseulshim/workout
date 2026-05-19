"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkoutStore, type ActiveExercise, type ActiveSet } from "@/store/workout-store";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Check, Plus, Trash2, Timer, X, ChevronDown } from "lucide-react";
import { ExerciseList } from "@/components/exercises/exercise-list";
import type { Exercise } from "@/types/database";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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
    endWorkout,
    restTimer,
    tickRestTimer,
    stopRestTimer,
  } = useWorkoutStore();

  const [finishing, setFinishing] = useState(false);
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load exercise library for adding exercises
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("exercises").select("*").order("name");
      setExercises(data ?? []);
    }
    load();
  }, []);

  // Rest timer tick
  useEffect(() => {
    if (restTimer.active) {
      timerRef.current = setInterval(() => {
        tickRestTimer();
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (restTimer.seconds === 0) {
        // Timer finished — vibrate and notify
        if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
        toast.info("Rest over! Time for your next set.", { duration: 3000 });
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [restTimer.active, tickRestTimer, restTimer.seconds]);

  if (!activeWorkout) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground">No active workout.</p>
        <Button onClick={() => router.push("/workout/start")}>Start a Workout</Button>
      </div>
    );
  }

  const totalSets = activeWorkout.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const completedSets = activeWorkout.exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.completed).length,
    0
  );
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  function handleAddExercise(exercise: Exercise) {
    addExercise({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: [
        {
          id: Math.random().toString(36).slice(2),
          setNumber: 1,
          reps: "",
          weight: "",
          weightUnit: "lbs",
          isBodyweight: false,
          completed: false,
        },
      ],
    });
    setAddExerciseOpen(false);
    toast.success(`${exercise.name} added`);
  }

  async function handleFinish() {
    if (!activeWorkout) return;
    setFinishing(true);
    const supabase = createClient();

    // Mark session as finished
    await supabase
      .from("workout_sessions")
      .update({ finished_at: new Date().toISOString() })
      .eq("id", activeWorkout.sessionId!);

    // Save all completed sets
    const setsToInsert = activeWorkout.exercises.flatMap((ex) =>
      ex.sets
        .filter((s) => s.completed)
        .map((s) => ({
          session_id: activeWorkout.sessionId!,
          exercise_id: ex.exerciseId,
          set_number: s.setNumber,
          reps: s.reps ? parseInt(s.reps) : null,
          weight: s.weight ? parseFloat(s.weight) : null,
          weight_unit: s.weightUnit,
          is_bodyweight: s.isBodyweight,
        }))
    );

    if (setsToInsert.length > 0) {
      await supabase.from("workout_sets").insert(setsToInsert);
    }

    endWorkout();
    toast.success("Workout saved! 💪");
    router.push("/history");
  }

  async function handleDiscard() {
    if (!activeWorkout) return;
    const supabase = createClient();
    if (activeWorkout.sessionId) {
      await supabase.from("workout_sessions").delete().eq("id", activeWorkout.sessionId);
    }
    endWorkout();
    router.push("/");
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold truncate max-w-[180px]">{activeWorkout.name}</h1>
          <p className="text-xs text-muted-foreground">
            Started {formatDistanceToNow(new Date(activeWorkout.startedAt), { addSuffix: true })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDiscard}>
            <X className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleFinish} disabled={finishing || completedSets === 0}>
            {finishing ? "Saving…" : "Finish"}
          </Button>
        </div>
      </div>

      {/* Progress */}
      {totalSets > 0 && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {completedSets}/{totalSets} sets
          </p>
        </div>
      )}

      {/* Rest timer */}
      {restTimer.active && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Rest Timer</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold tabular-nums text-primary">
                {Math.floor(restTimer.seconds / 60)}:{String(restTimer.seconds % 60).padStart(2, "0")}
              </span>
              <Button size="sm" variant="ghost" onClick={stopRestTimer}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exercises */}
      {activeWorkout.exercises.map((ex) => (
        <ExerciseCard
          key={ex.exerciseId}
          exercise={ex}
          onAddSet={() => addSet(ex.exerciseId)}
          onRemoveSet={(setId) => removeSet(ex.exerciseId, setId)}
          onUpdateSet={(setId, updates) => updateSet(ex.exerciseId, setId, updates)}
          onToggleComplete={(setId) => toggleSetComplete(ex.exerciseId, setId)}
          onRemoveExercise={() => removeExercise(ex.exerciseId)}
        />
      ))}

      {/* Add exercise button */}
      <Sheet open={addExerciseOpen} onOpenChange={setAddExerciseOpen}>
        <SheetTrigger className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Exercise
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle>Add Exercise</SheetTitle>
          </SheetHeader>
          <div className="mt-4 overflow-y-auto h-full pb-8">
            <ExerciseList
              exercises={exercises}
              userId=""
              selectable
              onSelect={handleAddExercise}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ExerciseCard({
  exercise,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onToggleComplete,
  onRemoveExercise,
}: {
  exercise: ActiveExercise;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onUpdateSet: (setId: string, updates: Partial<ActiveSet>) => void;
  onToggleComplete: (setId: string) => void;
  onRemoveExercise: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const completedCount = exercise.sets.filter((s) => s.completed).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setCollapsed((v) => !v)} className="flex items-center gap-2">
              <ChevronDown
                className={cn("h-4 w-4 text-muted-foreground transition-transform", collapsed && "-rotate-90")}
              />
              <CardTitle className="text-base">{exercise.exerciseName}</CardTitle>
            </button>
            {completedCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {completedCount}/{exercise.sets.length}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemoveExercise}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-2 pt-0">
          {/* Column headers */}
          <div className="grid grid-cols-[32px_1fr_1fr_48px] gap-2 px-1">
            <span className="text-xs text-muted-foreground text-center">Set</span>
            <span className="text-xs text-muted-foreground text-center">Weight</span>
            <span className="text-xs text-muted-foreground text-center">Reps</span>
            <span />
          </div>

          {exercise.sets.map((s) => (
            <div
              key={s.id}
              className={cn(
                "grid grid-cols-[32px_1fr_1fr_48px] gap-2 items-center rounded-lg px-1 py-1 transition-colors",
                s.completed && "bg-primary/10"
              )}
            >
              <span className="text-xs text-center font-medium tabular-nums">{s.setNumber}</span>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={s.weight}
                onChange={(e) => onUpdateSet(s.id, { weight: e.target.value })}
                className="h-9 text-center text-sm"
              />
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={s.reps}
                onChange={(e) => onUpdateSet(s.id, { reps: e.target.value })}
                className="h-9 text-center text-sm"
              />
              <button
                onClick={() => onToggleComplete(s.id)}
                className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center transition-colors",
                  s.completed
                    ? "bg-primary text-primary-foreground"
                    : "border border-input hover:bg-muted"
                )}
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="flex-1" onClick={onAddSet}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Set
            </Button>
            {exercise.sets.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveSet(exercise.sets[exercise.sets.length - 1].id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
