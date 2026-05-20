"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Search, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Exercise, MuscleGroup, ExerciseCategory, EquipmentType, LogType } from "@/types/database";

const MUSCLE_GROUPS: MuscleGroup[] = [
  "chest", "back", "shoulders", "biceps", "triceps", "forearms",
  "core", "glutes", "quads", "hamstrings", "calves", "full_body", "other",
];
const CATEGORIES: ExerciseCategory[] = ["strength", "cardio", "bodyweight", "stretching", "other"];
const EQUIPMENT_TYPES: { value: EquipmentType; label: string }[] = [
  { value: "barbell", label: "Barbell" },
  { value: "dumbbell", label: "Dumbbell" },
  { value: "bodyweight", label: "Bodyweight" },
  { value: "machine", label: "Machine" },
  { value: "cable", label: "Cable" },
  { value: "ez_bar", label: "EZ Bar" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "band", label: "Band" },
  { value: "plate", label: "Plate" },
  { value: "other", label: "Other" },
];
const LOG_TYPES: { value: LogType; label: string; description: string }[] = [
  { value: "weight_reps", label: "Weight & Reps", description: "Log weight + reps each set" },
  { value: "bodyweight_reps", label: "Bodyweight Reps", description: "Log reps only" },
  { value: "weighted_bodyweight", label: "Weighted Bodyweight", description: "Log added weight + reps" },
  { value: "assisted_bodyweight", label: "Assisted Bodyweight", description: "Log assistance weight + reps" },
  { value: "duration", label: "Duration", description: "Log time (seconds)" },
];

const muscleLabel = (m: MuscleGroup) =>
  m.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

interface Props {
  exercises: Exercise[];
  userId: string;
  onSelect?: (exercise: Exercise) => void;
  selectable?: boolean;
}

export function ExerciseList({ exercises: initial, userId, onSelect, selectable = false }: Props) {
  const [exercises, setExercises] = useState(initial);
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | "all">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMuscle, setNewMuscle] = useState<MuscleGroup>("other");
  const [newCategory, setNewCategory] = useState<ExerciseCategory>("strength");
  const [newEquipment, setNewEquipment] = useState<EquipmentType>("other");
  const [newLogType, setNewLogType] = useState<LogType>("weight_reps");
  const [saving, setSaving] = useState(false);

  const filtered = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesMuscle = muscleFilter === "all" || ex.muscle_group === muscleFilter;
    return matchesSearch && matchesMuscle;
  });

  async function handleAddExercise(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("exercises")
      .insert({
        name: newName,
        muscle_group: newMuscle,
        category: newCategory,
        equipment_type: newEquipment,
        log_type: newLogType,
        is_custom: true,
        user_id: userId,
      })
      .select()
      .single();
    if (error) {
      toast.error("Failed to add exercise");
    } else {
      setExercises((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setAddOpen(false);
      toast.success(`${data.name} added!`);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger className={cn(buttonVariants({ size: "icon", variant: "outline" }))}>
            <Plus className="h-4 w-4" />
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Custom Exercise</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddExercise} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Cable Curl" required />
              </div>
              <div className="space-y-2">
                <Label>Muscle Group</Label>
                <Select value={newMuscle} onValueChange={(v) => setNewMuscle(v as MuscleGroup)}>
                  <SelectTrigger><span>{muscleLabel(newMuscle)}</span></SelectTrigger>
                  <SelectContent>
                    {MUSCLE_GROUPS.map((m) => (
                      <SelectItem key={m} value={m}>{muscleLabel(m)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Equipment</Label>
                <Select value={newEquipment} onValueChange={(v) => setNewEquipment(v as EquipmentType)}>
                  <SelectTrigger><span>{EQUIPMENT_TYPES.find(e => e.value === newEquipment)?.label}</span></SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_TYPES.map((e) => (
                      <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Exercise Type</Label>
                <Select value={newLogType} onValueChange={(v) => setNewLogType(v as LogType)}>
                  <SelectTrigger><span>{LOG_TYPES.find(t => t.value === newLogType)?.label}</span></SelectTrigger>
                  <SelectContent>
                    {LOG_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <div>
                          <p className="font-medium">{t.label}</p>
                          <p className="text-xs text-muted-foreground">{t.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newCategory} onValueChange={(v) => setNewCategory(v as ExerciseCategory)}>
                  <SelectTrigger><span>{newCategory.charAt(0).toUpperCase() + newCategory.slice(1)}</span></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Adding…" : "Add Exercise"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Muscle group filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Badge
          variant={muscleFilter === "all" ? "default" : "outline"}
          className="cursor-pointer shrink-0"
          onClick={() => setMuscleFilter("all")}
        >
          All
        </Badge>
        {MUSCLE_GROUPS.map((m) => (
          <Badge
            key={m}
            variant={muscleFilter === m ? "default" : "outline"}
            className="cursor-pointer shrink-0"
            onClick={() => setMuscleFilter(m)}
          >
            {muscleLabel(m)}
          </Badge>
        ))}
      </div>

      <div className="space-y-1">
        {filtered.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8">No exercises found.</p>
        )}
        {filtered.map((ex) => (
          <Card
            key={ex.id}
            className={selectable ? "cursor-pointer hover:bg-muted/50 transition-colors active:bg-muted" : ""}
            onClick={() => onSelect?.(ex)}
          >
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-sm">{ex.name}</p>
                <p className="text-xs text-muted-foreground">
                  {muscleLabel(ex.muscle_group)}
                  {" · "}
                  {EQUIPMENT_TYPES.find(e => e.value === ex.equipment_type)?.label ?? ex.equipment_type}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                  {LOG_TYPES.find(t => t.value === ex.log_type)?.label ?? ex.log_type}
                </Badge>
                {ex.is_custom && <Badge variant="secondary" className="text-xs">Custom</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
