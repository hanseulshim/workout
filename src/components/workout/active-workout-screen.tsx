"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { useWorkoutStore, type ActiveExercise, type ActiveSet } from "@/store/workout-store";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Check, Plus, Trash2, Timer, X } from "lucide-react";
import { ExerciseList } from "@/components/exercises/exercise-list";
import { ExerciseEditorCard, SupersetLinkButton, SupersetGroup } from "@/components/workout/exercise-editor-card";
import type { Exercise, LogType } from "@/types/database";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const REST_PRESETS = [
  { label: "30s", seconds: 30 },
  { label: "1m", seconds: 60 },
  { label: "1:30", seconds: 90 },
  { label: "2m", seconds: 120 },
  { label: "3m", seconds: 180 },
];

// Group exercises by supersetId
type ExGroup =
  | { type: "single"; ex: ActiveExercise }
  | { type: "superset"; supersetId: string; exercises: ActiveExercise[] };

function buildGroups(exercises: ActiveExercise[]): ExGroup[] {
  const groups: ExGroup[] = [];
  const seen = new Set<string>();
  for (const ex of exercises) {
    if (seen.has(ex.exerciseId)) continue;
    if (!ex.supersetId) {
      groups.push({ type: "single", ex });
    } else {
      const members = exercises.filter((e) => e.supersetId === ex.supersetId);
      members.forEach((e) => seen.add(e.exerciseId));
      groups.push({ type: "superset", supersetId: ex.supersetId, exercises: members });
    }
    seen.add(ex.exerciseId);
  }
  return groups;
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
    tickRestTimer,
    stopRestTimer,
    startRestTimer,
    linkSuperset,
    unlinkSuperset,
    setExerciseRestTime,
  } = useWorkoutStore();

  const [finishing, setFinishing] = useState(false);
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("exercises").select("*").order("name");
      setExercises(data ?? []);
    }
    load();
  }, []);

  useEffect(() => {
    if (restTimer.active) {
      timerRef.current = setInterval(() => tickRestTimer(), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (restTimer.seconds === 0) {
        if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
        toast.info("Rest over! Time for your next set.", { duration: 3000 });
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
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
    (n, ex) => n + ex.sets.filter((s) => s.completed).length, 0
  );
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  function handleAddExercise(exList: Exercise[]) {
    exList.forEach((exercise) => {
      addExercise({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        gifUrl: exercise.gif_url ?? null,
        logType: exercise.log_type,
        supersetId: null,
        restSeconds: 90,
        sets: [{
          id: Math.random().toString(36).slice(2),
          setNumber: 1,
          reps: "",
          weight: "",
          weightUnit: "lbs",
          isBodyweight: ["bodyweight_reps", "weighted_bodyweight", "assisted_bodyweight"].includes(exercise.log_type),
          durationSeconds: "",
          completed: false,
        }],
      });
    });
    setAddExerciseOpen(false);
    if (exList.length === 1) toast.success(`${exList[0].name} added`);
    else toast.success(`${exList.length} exercises added`);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const ids = activeWorkout.exercises.map((e) => e.exerciseId);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      reorderExercises(arrayMove(ids, oldIndex, newIndex));
    }
  }

  async function handleFinish() {
    if (!activeWorkout) return;
    setFinishing(true);
    const supabase = createClient();
    await supabase.from("workout_sessions").update({ finished_at: new Date().toISOString() }).eq("id", activeWorkout.sessionId!);
    const setsToInsert = activeWorkout.exercises.flatMap((ex) =>
      ex.sets.filter((s) => s.completed).map((s) => ({
        session_id: activeWorkout.sessionId!,
        exercise_id: ex.exerciseId,
        set_number: s.setNumber,
        reps: ex.logType === "duration" ? null : (s.reps ? parseInt(s.reps) : null),
        weight: ["weight_reps", "weighted_bodyweight", "assisted_bodyweight"].includes(ex.logType)
          ? (s.weight ? parseFloat(s.weight) : null) : null,
        weight_unit: s.weightUnit,
        is_bodyweight: ["bodyweight_reps", "weighted_bodyweight", "assisted_bodyweight"].includes(ex.logType),
        duration_seconds: ex.logType === "duration" ? (s.durationSeconds ? parseInt(s.durationSeconds) : null) : null,
      }))
    );
    if (setsToInsert.length > 0) await supabase.from("workout_sets").insert(setsToInsert);
    endWorkout();
    toast.success("Workout saved! 💪");
    router.push("/history");
  }

  async function handleDiscard() {
    if (!activeWorkout) return;
    const supabase = createClient();
    if (activeWorkout.sessionId) await supabase.from("workout_sessions").delete().eq("id", activeWorkout.sessionId);
    endWorkout();
    router.push("/");
  }

  const groups = buildGroups(activeWorkout.exercises);

  return (
    <div className="space-y-3 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold truncate max-w-[180px]">{activeWorkout.name}</h1>
          <p className="text-xs text-muted-foreground">
            Started {formatDistanceToNow(new Date(activeWorkout.startedAt), { addSuffix: true })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDiscard}><X className="h-4 w-4" /></Button>
          <Button size="sm" onClick={handleFinish} disabled={finishing || completedSets === 0}>
            {finishing ? "Saving…" : "Finish"}
          </Button>
        </div>
      </div>

      {/* Progress */}
      {totalSets > 0 && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">{completedSets}/{totalSets} sets</p>
        </div>
      )}

      {/* Rest timer */}
      {restTimer.active && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Rest</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold tabular-nums text-primary">
                {Math.floor(restTimer.seconds / 60)}:{String(restTimer.seconds % 60).padStart(2, "0")}
              </span>
              <Button size="sm" variant="ghost" onClick={stopRestTimer}><X className="h-3 w-3" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exercise groups */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={activeWorkout.exercises.map((e) => e.exerciseId)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {groups.map((group, gi) => (
              <div key={group.type === "single" ? group.ex.exerciseId : group.supersetId}>
                {group.type === "single" ? (
                  <div className="space-y-1">
                    <ActiveExerciseCard
                      exercise={group.ex}
                      onAddSet={() => addSet(group.ex.exerciseId)}
                      onRemoveSet={(setId) => removeSet(group.ex.exerciseId, setId)}
                      onUpdateSet={(setId, updates) => updateSet(group.ex.exerciseId, setId, updates)}
                      onToggleComplete={(setId) => toggleSetComplete(group.ex.exerciseId, setId)}
                      onRemoveExercise={() => removeExercise(group.ex.exerciseId)}
                      onSetRestTime={(s) => setExerciseRestTime(group.ex.exerciseId, s)}
                      onStartRest={(s) => startRestTimer(group.ex.exerciseId, s)}
                    />
                    {gi < groups.length - 1 && (
                      <SupersetLinkButton
                        onClick={() => {
                          const next = groups[gi + 1];
                          const nextId = next.type === "single" ? next.ex.exerciseId : next.exercises[0].exerciseId;
                          linkSuperset(group.ex.exerciseId, nextId);
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <SupersetGroup>
                      {group.exercises.map((ex) => (
                        <ActiveExerciseCard
                          key={ex.exerciseId}
                          exercise={ex}
                          onAddSet={() => addSet(ex.exerciseId)}
                          onRemoveSet={(setId) => removeSet(ex.exerciseId, setId)}
                          onUpdateSet={(setId, updates) => updateSet(ex.exerciseId, setId, updates)}
                          onToggleComplete={(setId) => toggleSetComplete(ex.exerciseId, setId)}
                          onRemoveExercise={() => removeExercise(ex.exerciseId)}
                          onSetRestTime={(s) => setExerciseRestTime(ex.exerciseId, s)}
                          onStartRest={(s) => startRestTimer(ex.exerciseId, s)}
                          onUnlinkSuperset={() => unlinkSuperset(ex.exerciseId)}
                        />
                      ))}
                    </SupersetGroup>
                    {gi < groups.length - 1 && (
                      <SupersetLinkButton
                        onClick={() => {
                          const next = groups[gi + 1];
                          const nextId = next.type === "single" ? next.ex.exerciseId : next.exercises[0].exerciseId;
                          const last = group.exercises[group.exercises.length - 1].exerciseId;
                          linkSuperset(last, nextId);
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add exercise */}
      <Sheet open={addExerciseOpen} onOpenChange={setAddExerciseOpen}>
        <SheetTrigger className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
          <Plus className="h-4 w-4 mr-2" />Add Exercise
        </SheetTrigger>
        <SheetContent side="bottom" className="flex flex-col h-dvh p-0">
          <SheetHeader className="px-4 pt-4 pb-2 shrink-0 border-b">
            <SheetTitle>Add Exercise</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <ExerciseList exercises={exercises} userId="" selectable onSelect={handleAddExercise} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ActiveExerciseCard({
  exercise,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onToggleComplete,
  onRemoveExercise,
  onSetRestTime,
  onStartRest,
  onUnlinkSuperset,
}: {
  exercise: ActiveExercise;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onUpdateSet: (setId: string, updates: Partial<ActiveSet>) => void;
  onToggleComplete: (setId: string) => void;
  onRemoveExercise: () => void;
  onSetRestTime: (seconds: number) => void;
  onStartRest: (seconds: number) => void;
  onUnlinkSuperset?: () => void;
}) {
  const [showRestPicker, setShowRestPicker] = useState(false);
  const completedCount = exercise.sets.filter((s) => s.completed).length;

  function formatRest(s: number) {
    if (s === 0) return "Off";
    return s < 60 ? `${s}s` : s % 60 === 0 ? `${s / 60}m` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  return (
    <ExerciseEditorCard
      id={exercise.exerciseId}
      name={exercise.exerciseName}
      gifUrl={exercise.gifUrl}
      supersetId={exercise.supersetId}
      setsCount={exercise.sets.length}
      completedCount={completedCount}
      onRemove={onRemoveExercise}
      onUnlinkSuperset={onUnlinkSuperset}
      footer={
        showRestPicker ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground shrink-0">Rest timer:</span>
              {[{ label: "Off", seconds: 0 }, ...REST_PRESETS].map((p) => (
                <button
                  key={p.seconds}
                  type="button"
                  onClick={() => {
                    onSetRestTime(p.seconds);
                    if (p.seconds > 0) onStartRest(p.seconds);
                    setShowRestPicker(false);
                  }}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-md border transition-colors",
                    exercise.restSeconds === p.seconds
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  )}
                >
                  {p.label}
                </button>
              ))}
              <button type="button" onClick={() => setShowRestPicker(false)} className="text-xs text-muted-foreground ml-auto">Done</button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onAddSet}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add Set
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRestPicker(true)}
              className={cn(exercise.restSeconds > 0 && "text-primary border-primary/50")}
            >
              <Timer className="h-3.5 w-3.5 mr-1" />
              {formatRest(exercise.restSeconds)}
            </Button>
            {exercise.sets.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => onRemoveSet(exercise.sets[exercise.sets.length - 1].id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )
      }
    >
      <SetColumnHeaders logType={exercise.logType} />
      {exercise.sets.map((s) => (
        <SetRow
          key={s.id}
          set={s}
          logType={exercise.logType}
          onUpdate={(updates) => onUpdateSet(s.id, updates)}
          onToggleComplete={() => onToggleComplete(s.id)}
        />
      ))}
    </ExerciseEditorCard>
  );
}

function SetColumnHeaders({ logType }: { logType: LogType }) {
  if (logType === "duration") return (
    <div className="grid grid-cols-[32px_1fr_48px] gap-2 px-1">
      <span className="text-xs text-muted-foreground text-center">Set</span>
      <span className="text-xs text-muted-foreground text-center">Duration (sec)</span>
      <span />
    </div>
  );
  if (logType === "bodyweight_reps") return (
    <div className="grid grid-cols-[32px_1fr_48px] gap-2 px-1">
      <span className="text-xs text-muted-foreground text-center">Set</span>
      <span className="text-xs text-muted-foreground text-center">Reps</span>
      <span />
    </div>
  );
  const weightLabel = logType === "weighted_bodyweight" ? "+Weight" : logType === "assisted_bodyweight" ? "Assist" : "Weight";
  return (
    <div className="grid grid-cols-[32px_1fr_1fr_48px] gap-2 px-1">
      <span className="text-xs text-muted-foreground text-center">Set</span>
      <span className="text-xs text-muted-foreground text-center">{weightLabel}</span>
      <span className="text-xs text-muted-foreground text-center">Reps</span>
      <span />
    </div>
  );
}

function SetRow({ set: s, logType, onUpdate, onToggleComplete }: {
  set: ActiveSet; logType: LogType;
  onUpdate: (updates: Partial<ActiveSet>) => void;
  onToggleComplete: () => void;
}) {
  const rowClass = cn("grid gap-2 items-center rounded-lg px-1 py-1 transition-colors", s.completed && "bg-primary/10");
  const checkBtn = (
    <button
      onClick={onToggleComplete}
      className={cn("h-9 w-9 rounded-lg flex items-center justify-center transition-colors shrink-0", s.completed ? "bg-primary text-primary-foreground" : "border border-input hover:bg-muted")}
    >
      <Check className="h-4 w-4" />
    </button>
  );

  if (logType === "duration") return (
    <div className={cn(rowClass, "grid-cols-[32px_1fr_48px]")}>
      <span className="text-xs text-center font-medium tabular-nums">{s.setNumber}</span>
      <Input type="number" inputMode="numeric" placeholder="0" value={s.durationSeconds} onChange={(e) => onUpdate({ durationSeconds: e.target.value })} onFocus={(e) => e.target.select()} className="h-9 text-center text-sm" />
      {checkBtn}
    </div>
  );
  if (logType === "bodyweight_reps") return (
    <div className={cn(rowClass, "grid-cols-[32px_1fr_48px]")}>
      <span className="text-xs text-center font-medium tabular-nums">{s.setNumber}</span>
      <Input type="number" inputMode="numeric" placeholder="0" value={s.reps} onChange={(e) => onUpdate({ reps: e.target.value })} onFocus={(e) => e.target.select()} className="h-9 text-center text-sm" />
      {checkBtn}
    </div>
  );
  return (
    <div className={cn(rowClass, "grid-cols-[32px_1fr_1fr_48px]")}>
      <span className="text-xs text-center font-medium tabular-nums">{s.setNumber}</span>
      <Input type="number" inputMode="decimal" placeholder="0" value={s.weight} onChange={(e) => onUpdate({ weight: e.target.value })} onFocus={(e) => e.target.select()} className="h-9 text-center text-sm" />
      <Input type="number" inputMode="numeric" placeholder="0" value={s.reps} onChange={(e) => onUpdate({ reps: e.target.value })} onFocus={(e) => e.target.select()} className="h-9 text-center text-sm" />
      {checkBtn}
    </div>
  );
}
