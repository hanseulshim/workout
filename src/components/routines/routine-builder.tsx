"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/types/database";
import { RoutineBuilderExerciseGroups } from "./routine-builder-exercise-groups";
import { saveRoutine } from "./routine-builder-save";
import { RoutineExercisePickerSheet } from "./routine-exercise-picker-sheet";
import type { ExistingRoutine, SelectedExercise, SetTarget } from "./routine-builder-types";

interface Props {
  exercises: Exercise[];
  userId: string;
  routine?: ExistingRoutine;
}

function defaultSets(count: number, defaultReps?: number | null): SetTarget[] {
  return Array.from({ length: count }, () => ({ reps: defaultReps?.toString() ?? "" }));
}

export function RoutineBuilder({ exercises, userId, routine }: Props) {
  const router = useRouter();
  const routineKey = routine?.id ?? "new";

  function buildSelected(): SelectedExercise[] {
    return routine?.routine_exercises
      .sort((a, b) => a.position - b.position)
      .map((re) => ({
        exerciseId: re.exercise_id,
        name: re.exercises?.name ?? "Unknown",
        gifUrl: re.exercises?.gif_url ?? null,
        logType: re.exercises?.log_type ?? "weight_reps",
        sets: re.set_targets ?? defaultSets(re.default_sets, re.default_reps),
        supersetId: re.superset_id ?? null,
        notes: re.notes ?? "",
        restSeconds: re.rest_seconds ?? 0,
      })) ?? [];
  }

  const [name, setName] = useState(routine?.name ?? "");
  const [days, setDays] = useState<number[]>(routine?.days ?? []);
  const [selected, setSelected] = useState<SelectedExercise[]>(buildSelected);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const prevRoutineKey = useRef(routineKey);

  if (prevRoutineKey.current !== routineKey) {
    prevRoutineKey.current = routineKey;
    setName(routine?.name ?? "");
    setDays(routine?.days ?? []);
    setSelected(buildSelected());
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSelected((prev) => arrayMove(prev, prev.findIndex((e) => e.exerciseId === active.id), prev.findIndex((e) => e.exerciseId === over.id)));
    }
  }

  function handleAddExercise(newExercises: Exercise[]) {
    const toAdd = newExercises.filter((e) => !selected.find((s) => s.exerciseId === e.id));
    if (toAdd.length < newExercises.length) toast.info("Some exercises already added");
    if (toAdd.length === 0) return;
    setSelected((prev) => [
      ...prev,
      ...toAdd.map((e) => ({
        exerciseId: e.id,
        name: e.name,
        gifUrl: e.gif_url ?? null,
        logType: e.log_type,
        sets: defaultSets(3),
        supersetId: null,
        notes: "",
        restSeconds: 0,
      })),
    ]);
    setAddOpen(false);
  }

  const updateSet = (exIdx: number, setIdx: number, updates: Partial<SetTarget>) =>
    setSelected((prev) => prev.map((ex, i) => (i !== exIdx ? ex : { ...ex, sets: ex.sets.map((s, j) => (j === setIdx ? { ...s, ...updates } : s)) })));

  const addSet = (exerciseId: string) =>
    setSelected((prev) => prev.map((ex) => (ex.exerciseId !== exerciseId ? ex : { ...ex, sets: [...ex.sets, { reps: ex.sets[ex.sets.length - 1]?.reps ?? "" }] })));

  const removeSet = (exerciseId: string, setIdx: number) =>
    setSelected((prev) => prev.map((ex) => (ex.exerciseId !== exerciseId || ex.sets.length <= 1 ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) })));

  const removeExercise = (exerciseId: string) => setSelected((prev) => prev.filter((e) => e.exerciseId !== exerciseId));
  const updateNotes = (exerciseId: string, notes: string) => setSelected((prev) => prev.map((ex) => ex.exerciseId !== exerciseId ? ex : { ...ex, notes }));
  const updateRestSeconds = (exerciseId: string, restSeconds: number) => setSelected((prev) => prev.map((ex) => ex.exerciseId !== exerciseId ? ex : { ...ex, restSeconds }));

  function linkSuperset(id1: string, id2: string) {
    setSelected((prev) => {
      const ex1 = prev.find((e) => e.exerciseId === id1);
      const ex2 = prev.find((e) => e.exerciseId === id2);
      const supersetId = ex1?.supersetId ?? ex2?.supersetId ?? Math.random().toString(36).slice(2);
      return prev.map((ex) =>
        ex.exerciseId === id1 ||
        ex.exerciseId === id2 ||
        (ex1?.supersetId && ex.supersetId === ex1.supersetId) ||
        (ex2?.supersetId && ex.supersetId === ex2.supersetId)
          ? { ...ex, supersetId }
          : ex
      );
    });
  }

  function unlinkSuperset(exerciseId: string) {
    setSelected((prev) => {
      const target = prev.find((e) => e.exerciseId === exerciseId);
      if (!target?.supersetId) return prev;
      const members = prev.filter((e) => e.supersetId === target.supersetId);
      return prev.map((ex) =>
        ex.supersetId === target.supersetId
          ? { ...ex, supersetId: members.length <= 2 ? null : ex.exerciseId === exerciseId ? null : ex.supersetId }
          : ex
      );
    });
  }

  async function handleSave() {
    if (!name.trim()) return void toast.error("Give your routine a name");
    if (selected.length === 0) return void toast.error("Add at least one exercise");

    setSaving(true);

    try {
      const routineId = await saveRoutine({ name, days, selected, userId, routine });
      toast.success(routine ? "Routine updated!" : "Routine created!");
      router.push(`/routines/${routineId}`);
    } catch (error) {
      console.error("Routine save failed", error);
      toast.error("Failed to save routine. Your existing exercises were restored.");
    } finally {
      setSaving(false);
    }
  }

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function toggleDay(d: number) {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Routine Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Push Day" />
      </div>
      <div className="space-y-2">
        <Label>Schedule (optional)</Label>
        <div className="flex gap-1.5 flex-wrap">
          {DAY_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              className={cn(
                "h-9 w-10 rounded-md border text-xs font-medium transition-colors",
                days.includes(i)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input hover:bg-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={selected.map((e) => e.exerciseId)} strategy={verticalListSortingStrategy}>
          <RoutineBuilderExerciseGroups
            selected={selected}
            onUpdate={updateSet}
            onAddSet={addSet}
            onRemoveSet={removeSet}
            onRemove={removeExercise}
            onLinkSuperset={linkSuperset}
            onUnlink={unlinkSuperset}
            onUpdateNotes={updateNotes}
            onUpdateRestSeconds={updateRestSeconds}
          />
        </SortableContext>
      </DndContext>
      <RoutineExercisePickerSheet open={addOpen} onOpenChange={setAddOpen} exercises={exercises} userId={userId} onSelect={handleAddExercise} />
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => router.push(routine ? `/routines/${routine.id}` : "/routines")} disabled={saving}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : routine ? "Save Changes" : "Create Routine"}
        </Button>
      </div>
    </div>
  );
}
