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

interface RoutineExerciseRow {
  exercise_id: string;
  position: number;
  default_sets: number;
  default_reps: number | null;
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
  sets: number;
  reps: string;
}

interface Props {
  exercises: Exercise[];
  userId: string;
  routine?: ExistingRoutine;
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
        sets: re.default_sets,
        reps: re.default_reps?.toString() ?? "",
      })) ?? []
  );
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleAddExercise(exercise: Exercise) {
    if (selected.find((s) => s.exerciseId === exercise.id)) {
      toast.info("Already added");
      return;
    }
    setSelected((prev) => [...prev, { exerciseId: exercise.id, name: exercise.name, sets: 3, reps: "" }]);
    setAddOpen(false);
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Give your routine a name"); return; }
    if (selected.length === 0) { toast.error("Add at least one exercise"); return; }
    setSaving(true);
    const supabase = createClient();

    if (routine) {
      // Update existing
      await supabase.from("routines").update({ name, updated_at: new Date().toISOString() }).eq("id", routine.id);
      await supabase.from("routine_exercises").delete().eq("routine_id", routine.id);
      await supabase.from("routine_exercises").insert(
        selected.map((ex, i) => ({
          routine_id: routine.id,
          exercise_id: ex.exerciseId,
          position: i,
          default_sets: ex.sets,
          default_reps: ex.reps ? parseInt(ex.reps) : null,
        }))
      );
      toast.success("Routine updated!");
      router.push("/routines");
    } else {
      const { data: newRoutine, error } = await supabase
        .from("routines")
        .insert({ user_id: userId, name })
        .select()
        .single();
      if (error || !newRoutine) { toast.error("Failed to save"); setSaving(false); return; }
      await supabase.from("routine_exercises").insert(
        selected.map((ex, i) => ({
          routine_id: newRoutine.id,
          exercise_id: ex.exerciseId,
          position: i,
          default_sets: ex.sets,
          default_reps: ex.reps ? parseInt(ex.reps) : null,
        }))
      );
      toast.success("Routine created!");
      router.push("/routines");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Routine Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Push Day" />
      </div>

      <div className="space-y-2">
        {selected.map((ex, idx) => (
          <Card key={ex.exerciseId}>
            <CardContent className="py-3">
              <div className="flex items-center gap-2 mb-2">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium text-sm flex-1">{ex.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setSelected((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Sets</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={ex.sets}
                    onChange={(e) =>
                      setSelected((prev) =>
                        prev.map((s, i) => i === idx ? { ...s, sets: parseInt(e.target.value) || 1 } : s)
                      )
                    }
                    className="h-8 text-sm"
                    min={1}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Default Reps</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="—"
                    value={ex.reps}
                    onChange={(e) =>
                      setSelected((prev) =>
                        prev.map((s, i) => i === idx ? { ...s, reps: e.target.value } : s)
                      )
                    }
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetTrigger className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Exercise
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle>Add Exercise</SheetTitle>
          </SheetHeader>
          <div className="mt-4 overflow-y-auto h-full pb-8">
            <ExerciseList exercises={exercises} userId={userId} selectable onSelect={handleAddExercise} />
          </div>
        </SheetContent>
      </Sheet>

      <Button className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : routine ? "Save Changes" : "Create Routine"}
      </Button>
    </div>
  );
}
