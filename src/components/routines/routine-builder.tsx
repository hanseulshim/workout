"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { ExerciseList } from "@/components/exercises/exercise-list";
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
  sets: SetTarget[];
}

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
  const [name, setName] = useState(routine?.name ?? "");
  const [selected, setSelected] = useState<SelectedExercise[]>(
    routine?.routine_exercises
      .sort((a, b) => a.position - b.position)
      .map((re) => ({
        exerciseId: re.exercise_id,
        name: re.exercises?.name ?? "Unknown",
        sets: re.set_targets ?? defaultSets(re.default_sets, re.default_reps),
      })) ?? []
  );
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleAddExercise(newExercises: Exercise[]) {
    const toAdd = newExercises.filter((e) => !selected.find((s) => s.exerciseId === e.id));
    if (toAdd.length < newExercises.length) toast.info("Some exercises already added");
    if (toAdd.length === 0) return;
    setSelected((prev) => [
      ...prev,
      ...toAdd.map((e) => ({ exerciseId: e.id, name: e.name, sets: defaultSets(3) })),
    ]);
    setAddOpen(false);
  }

  function updateSet(exIdx: number, setIdx: number, reps: string) {
    setSelected((prev) =>
      prev.map((ex, i) =>
        i !== exIdx
          ? ex
          : { ...ex, sets: ex.sets.map((s, j) => (j === setIdx ? { reps } : s)) }
      )
    );
  }

  function addSet(exIdx: number) {
    setSelected((prev) =>
      prev.map((ex, i) =>
        i !== exIdx ? ex : { ...ex, sets: [...ex.sets, { reps: ex.sets[ex.sets.length - 1]?.reps ?? "" }] }
      )
    );
  }

  function removeSet(exIdx: number, setIdx: number) {
    setSelected((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx || ex.sets.length <= 1) return ex;
        return { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) };
      })
    );
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

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Routine Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Push Day" />
      </div>

      <div className="space-y-3">
        {selected.map((ex, exIdx) => (
          <Card key={ex.exerciseId}>
            <CardContent className="py-3 space-y-3">
              {/* Exercise header */}
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium text-sm flex-1">{ex.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setSelected((prev) => prev.filter((_, i) => i !== exIdx))}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>

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
                      onChange={(e) => updateSet(exIdx, setIdx, e.target.value)}
                      className="h-8 text-sm"
                    />
                    <button
                      onClick={() => removeSet(exIdx, setIdx)}
                      disabled={ex.sets.length <= 1}
                      className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add set */}
              <button
                onClick={() => addSet(exIdx)}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1 border border-dashed rounded-md"
              >
                + Add Set
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

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
