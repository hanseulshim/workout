"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { ExerciseList } from "@/components/exercises/exercise-list";
import { ExerciseEditorCard, SupersetLinkButton, SupersetGroup } from "@/components/workout/exercise-editor-card";
import type { Exercise } from "@/types/database";

interface SetTarget {
  reps: string;
}

interface RoutineExerciseRow {
  exercise_id: string;
  position: number;
  default_sets: number;
  default_reps: number | null;
  set_targets: SetTarget[] | null;
  superset_id: string | null;
  exercises: Exercise | null;
}

interface ExistingRoutine {
  id: string;
  name: string;
  routine_exercises: RoutineExerciseRow[];
}

interface SelectedExercise {
  exerciseId: string;
  name: string;
  gifUrl: string | null;
  sets: SetTarget[];
  supersetId: string | null;
}

interface Props {
  exercises: Exercise[];
  userId: string;
  routine?: ExistingRoutine;
}

function defaultSets(count: number, defaultReps?: number | null): SetTarget[] {
  return Array.from({ length: count }, () => ({ reps: defaultReps?.toString() ?? "" }));
}

// Group consecutive exercises by supersetId (null = single)
type ExGroup =
  | { type: "single"; ex: SelectedExercise }
  | { type: "superset"; supersetId: string; exercises: SelectedExercise[] };

function buildGroups(exercises: SelectedExercise[]): ExGroup[] {
  const groups: ExGroup[] = [];
  let i = 0;
  while (i < exercises.length) {
    const ex = exercises[i];
    if (!ex.supersetId) {
      groups.push({ type: "single", ex });
      i++;
    } else {
      const sid = ex.supersetId;
      const members: SelectedExercise[] = [ex];
      while (i + 1 < exercises.length && exercises[i + 1].supersetId === sid) {
        i++;
        members.push(exercises[i]);
      }
      if (members.length === 1) {
        groups.push({ type: "single", ex });
      } else {
        groups.push({ type: "superset", supersetId: sid, exercises: members });
      }
      i++;
    }
  }
  return groups;
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
        sets: re.set_targets ?? defaultSets(re.default_sets, re.default_reps),
        supersetId: re.superset_id ?? null,
      })) ?? [];
  }

  const [name, setName] = useState(routine?.name ?? "");
  const [selected, setSelected] = useState<SelectedExercise[]>(buildSelected);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Re-sync when routine data changes (e.g. fresh server fetch after navigation)
  const prevRoutineKey = useRef(routineKey);
  if (prevRoutineKey.current !== routineKey) {
    prevRoutineKey.current = routineKey;
    setName(routine?.name ?? "");
    setSelected(buildSelected());
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSelected((prev) => {
        const oldIndex = prev.findIndex((e) => e.exerciseId === active.id);
        const newIndex = prev.findIndex((e) => e.exerciseId === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
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
        sets: defaultSets(3),
        supersetId: null,
      })),
    ]);
    setAddOpen(false);
  }

  function updateSet(exIdx: number, setIdx: number, reps: string) {
    setSelected((prev) =>
      prev.map((ex, i) =>
        i !== exIdx ? ex : { ...ex, sets: ex.sets.map((s, j) => (j === setIdx ? { reps } : s)) }
      )
    );
  }

  function addSet(exerciseId: string) {
    setSelected((prev) =>
      prev.map((ex) =>
        ex.exerciseId !== exerciseId
          ? ex
          : { ...ex, sets: [...ex.sets, { reps: ex.sets[ex.sets.length - 1]?.reps ?? "" }] }
      )
    );
  }

  function removeSet(exerciseId: string, setIdx: number) {
    setSelected((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== exerciseId || ex.sets.length <= 1) return ex;
        return { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) };
      })
    );
  }

  function removeExercise(exerciseId: string) {
    setSelected((prev) => prev.filter((e) => e.exerciseId !== exerciseId));
  }

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
      const sid = target.supersetId;
      const members = prev.filter((e) => e.supersetId === sid);
      // If only 2 remain after removal, clear the whole superset
      return prev.map((ex) =>
        ex.supersetId === sid
          ? { ...ex, supersetId: members.length <= 2 ? null : ex.exerciseId === exerciseId ? null : ex.supersetId }
          : ex
      );
    });
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Give your routine a name"); return; }
    if (selected.length === 0) { toast.error("Add at least one exercise"); return; }
    setSaving(true);
    const supabase = createClient();

    const rows = selected.map((ex, i) => ({
      exercise_id: ex.exerciseId,
      position: i,
      default_sets: ex.sets.length,
      default_reps: ex.sets[0]?.reps ? parseInt(ex.sets[0].reps) : null,
      set_targets: ex.sets,
      superset_id: ex.supersetId,
    }));

    if (routine) {
      await supabase.from("routines").update({ name, updated_at: new Date().toISOString() }).eq("id", routine.id);
      await supabase.from("routine_exercises").delete().eq("routine_id", routine.id);
      await supabase.from("routine_exercises").insert(rows.map((r) => ({ routine_id: routine.id, ...r })));
      toast.success("Routine updated!");
      router.push(`/routines/${routine.id}`);
    } else {
      const { data: newRoutine, error } = await supabase
        .from("routines")
        .insert({ user_id: userId, name })
        .select()
        .single();
      if (error || !newRoutine) { toast.error("Failed to save"); setSaving(false); return; }
      await supabase.from("routine_exercises").insert(rows.map((r) => ({ routine_id: newRoutine.id, ...r })));
      toast.success("Routine created!");
      router.push(`/routines/${newRoutine.id}`);
    }
    setSaving(false);
  }

  const groups = buildGroups(selected);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Routine Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Push Day" />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={selected.map((e) => e.exerciseId)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {groups.map((group, gi) => (
              <div key={group.type === "single" ? group.ex.exerciseId : group.supersetId}>
                {group.type === "single" ? (
                  <div className="space-y-1">
                    <RoutineExerciseCard
                      ex={group.ex}
                      exIdx={selected.findIndex((e) => e.exerciseId === group.ex.exerciseId)}
                      onUpdate={updateSet}
                      onAddSet={addSet}
                      onRemoveSet={removeSet}
                      onRemove={removeExercise}
                      onUnlink={unlinkSuperset}
                    />
                    {gi < groups.length - 1 && (
                      <SupersetLinkButton
                        extending={groups[gi + 1].type === "superset"}
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
                        <RoutineExerciseCard
                          key={ex.exerciseId}
                          ex={ex}
                          exIdx={selected.findIndex((e) => e.exerciseId === ex.exerciseId)}
                          onUpdate={updateSet}
                          onAddSet={addSet}
                          onRemoveSet={removeSet}
                          onRemove={removeExercise}
                          onUnlink={unlinkSuperset}
                        />
                      ))}
                    </SupersetGroup>
                    {gi < groups.length - 1 && (
                      <SupersetLinkButton
                        extending
                        onClick={() => {
                          const next = groups[gi + 1];
                          const nextId = next.type === "single" ? next.ex.exerciseId : next.exercises[0].exerciseId;
                          const lastInGroup = group.exercises[group.exercises.length - 1].exerciseId;
                          linkSuperset(lastInGroup, nextId);
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

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetTrigger className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Exercise
        </SheetTrigger>
        <SheetContent side="bottom" className="flex flex-col h-dvh p-0">
          <SheetHeader className="px-4 pt-4 pb-2 shrink-0 border-b">
            <SheetTitle>Add Exercise</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <ExerciseList exercises={exercises} userId={userId} selectable onSelect={handleAddExercise} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => router.push(routine ? `/routines/${routine.id}` : "/routines")}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : routine ? "Save Changes" : "Create Routine"}
        </Button>
      </div>
    </div>
  );
}

function RoutineExerciseCard({
  ex,
  exIdx,
  onUpdate,
  onAddSet,
  onRemoveSet,
  onRemove,
  onUnlink,
}: {
  ex: SelectedExercise;
  exIdx: number;
  onUpdate: (exIdx: number, setIdx: number, reps: string) => void;
  onAddSet: (id: string) => void;
  onRemoveSet: (id: string, setIdx: number) => void;
  onRemove: (id: string) => void;
  onUnlink: (id: string) => void;
}) {
  return (
    <ExerciseEditorCard
      id={ex.exerciseId}
      name={ex.name}
      gifUrl={ex.gifUrl}
      supersetId={ex.supersetId}
      setsCount={ex.sets.length}
      onRemove={() => onRemove(ex.exerciseId)}
      onUnlinkSuperset={ex.supersetId ? () => onUnlink(ex.exerciseId) : undefined}
      footer={
        <div className="flex gap-2">
          <button
            onClick={() => onAddSet(ex.exerciseId)}
            className="flex-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 border border-dashed rounded-md"
          >
            + Add Set
          </button>
          {ex.sets.length > 1 && (
            <button
              onClick={() => onRemoveSet(ex.exerciseId, ex.sets.length - 1)}
              className="px-3 py-1.5 border border-dashed rounded-md text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      }
    >
      {/* Set rows */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-[2rem_1fr_2rem] gap-2 px-1">
          <span className="text-xs text-muted-foreground text-center">Set</span>
          <span className="text-xs text-muted-foreground">Target Reps</span>
        </div>
        {ex.sets.map((set, setIdx) => (
          <div key={setIdx} className="grid grid-cols-[2rem_1fr_2rem] gap-2 items-center">
            <span className="text-xs font-medium text-center text-muted-foreground">{setIdx + 1}</span>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="—"
              value={set.reps}
              onChange={(e) => onUpdate(exIdx, setIdx, e.target.value)}
              className="h-8 text-sm"
            />
            <span className="w-6" />
          </div>
        ))}
      </div>
    </ExerciseEditorCard>
  );
}
