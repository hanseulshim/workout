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
import { Check, Plus, Trash2, Timer, X, ChevronDown, Link2, Link2Off } from "lucide-react";
import Image from "next/image";
import { ExerciseList } from "@/components/exercises/exercise-list";
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
    startRestTimer,
    linkSuperset,
    unlinkSuperset,
  } = useWorkoutStore();

  const [finishing, setFinishing] = useState(false);
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Group consecutive exercises by supersetId
  type ExGroup = { type: "single"; ex: ActiveExercise } | { type: "superset"; supersetId: string; exercises: ActiveExercise[] };
  const groups: ExGroup[] = [];
  const seen = new Set<string>();
  for (const ex of activeWorkout.exercises) {
    if (seen.has(ex.exerciseId)) continue;
    if (!ex.supersetId) {
      groups.push({ type: "single", ex });
    } else {
      const members = activeWorkout.exercises.filter((e) => e.supersetId === ex.supersetId);
      members.forEach((e) => seen.add(e.exerciseId));
      groups.push({ type: "superset", supersetId: ex.supersetId, exercises: members });
    }
    seen.add(ex.exerciseId);
  }

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
      {groups.map((group, i) => (
        <div key={group.type === "single" ? group.ex.exerciseId : group.supersetId}>
          {group.type === "single" ? (
            <div className="space-y-2">
              <ExerciseCard
                exercise={group.ex}
                onAddSet={() => addSet(group.ex.exerciseId)}
                onRemoveSet={(setId) => removeSet(group.ex.exerciseId, setId)}
                onUpdateSet={(setId, updates) => updateSet(group.ex.exerciseId, setId, updates)}
                onToggleComplete={(setId) => toggleSetComplete(group.ex.exerciseId, setId)}
                onRemoveExercise={() => removeExercise(group.ex.exerciseId)}
                onStartRest={(s) => startRestTimer(group.ex.exerciseId, s)}
              />
              {/* Superset link button between this and next exercise */}
              {i < groups.length - 1 && (
                <SupersetButton
                  onClick={() => {
                    const nextGroup = groups[i + 1];
                    const nextId = nextGroup.type === "single" ? nextGroup.ex.exerciseId : nextGroup.exercises[0].exerciseId;
                    linkSuperset(group.ex.exerciseId, nextId);
                  }}
                />
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative pl-3 border-l-2 border-orange-400 space-y-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Badge className="text-xs bg-orange-400 text-white">Superset</Badge>
                </div>
                {group.exercises.map((ex) => (
                  <ExerciseCard
                    key={ex.exerciseId}
                    exercise={ex}
                    onAddSet={() => addSet(ex.exerciseId)}
                    onRemoveSet={(setId) => removeSet(ex.exerciseId, setId)}
                    onUpdateSet={(setId, updates) => updateSet(ex.exerciseId, setId, updates)}
                    onToggleComplete={(setId) => toggleSetComplete(ex.exerciseId, setId)}
                    onRemoveExercise={() => removeExercise(ex.exerciseId)}
                    onStartRest={(s) => startRestTimer(ex.exerciseId, s)}
                    supersetId={group.supersetId}
                    onUnlinkSuperset={() => unlinkSuperset(ex.exerciseId)}
                  />
                ))}
              </div>
              {i < groups.length - 1 && (
                <SupersetButton
                  onClick={() => {
                    const nextGroup = groups[i + 1];
                    const nextId = nextGroup.type === "single" ? nextGroup.ex.exerciseId : nextGroup.exercises[0].exerciseId;
                    const firstId = group.exercises[group.exercises.length - 1].exerciseId;
                    linkSuperset(firstId, nextId);
                  }}
                />
              )}
            </div>
          )}
        </div>
      ))}

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

function SupersetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-1.5 py-1 text-xs text-muted-foreground hover:text-orange-400 transition-colors"
    >
      <Link2 className="h-3 w-3" />
      Link as Superset
    </button>
  );
}

function ExerciseCard({
  exercise,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onToggleComplete,
  onRemoveExercise,
  onStartRest,
  supersetId,
  onUnlinkSuperset,
}: {
  exercise: ActiveExercise;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onUpdateSet: (setId: string, updates: Partial<ActiveSet>) => void;
  onToggleComplete: (setId: string) => void;
  onRemoveExercise: () => void;
  onStartRest: (seconds: number) => void;
  supersetId?: string;
  onUnlinkSuperset?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [showRestPicker, setShowRestPicker] = useState(false);
  const completedCount = exercise.sets.filter((s) => s.completed).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <button onClick={() => setCollapsed((v) => !v)} className="flex items-center gap-2 flex-1 min-w-0">
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", collapsed && "-rotate-90")} />
            {exercise.gifUrl && (
              <div className="shrink-0 w-8 h-8 rounded overflow-hidden bg-muted">
                <Image src={exercise.gifUrl} alt={exercise.exerciseName} width={32} height={32} unoptimized className="object-cover w-full h-full" />
              </div>
            )}
            <CardTitle className="text-base truncate">{exercise.exerciseName}</CardTitle>
            {completedCount > 0 && (
              <Badge variant="secondary" className="text-xs shrink-0">{completedCount}/{exercise.sets.length}</Badge>
            )}
          </button>
          <div className="flex items-center gap-1 shrink-0">
            {supersetId && onUnlinkSuperset && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onUnlinkSuperset} title="Remove from superset">
                <Link2Off className="h-3.5 w-3.5 text-orange-400" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemoveExercise}>
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-2 pt-0">
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

          {/* Rest timer presets */}
          {showRestPicker ? (
            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">Rest:</span>
              {REST_PRESETS.map((p) => (
                <button
                  key={p.seconds}
                  type="button"
                  onClick={() => { onStartRest(p.seconds); setShowRestPicker(false); }}
                  className="text-xs px-2 py-1 rounded-md border hover:bg-muted transition-colors"
                >
                  {p.label}
                </button>
              ))}
              <button type="button" onClick={() => setShowRestPicker(false)} className="text-xs text-muted-foreground ml-auto">Cancel</button>
            </div>
          ) : (
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1" onClick={onAddSet}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add Set
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowRestPicker(true)}>
                <Timer className="h-3.5 w-3.5 mr-1" />Rest
              </Button>
              {exercise.sets.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => onRemoveSet(exercise.sets[exercise.sets.length - 1].id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
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
      <Input type="number" inputMode="numeric" placeholder="0" value={s.durationSeconds} onChange={(e) => onUpdate({ durationSeconds: e.target.value })} className="h-9 text-center text-sm" />
      {checkBtn}
    </div>
  );
  if (logType === "bodyweight_reps") return (
    <div className={cn(rowClass, "grid-cols-[32px_1fr_48px]")}>
      <span className="text-xs text-center font-medium tabular-nums">{s.setNumber}</span>
      <Input type="number" inputMode="numeric" placeholder="0" value={s.reps} onChange={(e) => onUpdate({ reps: e.target.value })} className="h-9 text-center text-sm" />
      {checkBtn}
    </div>
  );
  return (
    <div className={cn(rowClass, "grid-cols-[32px_1fr_1fr_48px]")}>
      <span className="text-xs text-center font-medium tabular-nums">{s.setNumber}</span>
      <Input type="number" inputMode="decimal" placeholder="0" value={s.weight} onChange={(e) => onUpdate({ weight: e.target.value })} className="h-9 text-center text-sm" />
      <Input type="number" inputMode="numeric" placeholder="0" value={s.reps} onChange={(e) => onUpdate({ reps: e.target.value })} className="h-9 text-center text-sm" />
      {checkBtn}
    </div>
  );
}
