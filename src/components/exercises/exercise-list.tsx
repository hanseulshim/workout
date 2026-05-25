"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Search, Plus, Dumbbell, ArrowLeft, Info, Check, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Exercise, MuscleGroup, EquipmentType, LogType } from "@/types/database";

const MUSCLE_GROUPS: MuscleGroup[] = [
  "chest", "back", "shoulders", "biceps", "triceps", "forearms",
  "core", "glutes", "quads", "hamstrings", "calves", "full_body", "other",
];
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

type View = "list" | "add" | "detail" | "edit";

interface Props {
  exercises: Exercise[];
  userId: string;
  onSelect?: (exercises: Exercise[]) => void;
  selectable?: boolean;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 py-2">{label}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function ExerciseList({ exercises: initial, userId, onSelect, selectable = false }: Props) {
  const [exercises, setExercises] = useState(initial);
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | "all">("all");
  const [recentIds, setRecentIds] = useState<string[]>([]);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Navigation state — single active view, no nested dialogs
  const [view, setView] = useState<View>("list");
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);

  // Add-exercise form state
  const [newName, setNewName] = useState("");
  const [newMuscle, setNewMuscle] = useState<MuscleGroup>("other");
  const [newEquipment, setNewEquipment] = useState<EquipmentType>("other");
  const [newLogType, setNewLogType] = useState<LogType>("weight_reps");
  const [newGifUrl, setNewGifUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    (async () => {
      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select("id")
        .eq("user_id", userId);
      const sessionIds = sessions?.map((s) => s.id) ?? [];
      if (sessionIds.length === 0) return;
      const { data: sets } = await supabase
        .from("workout_sets")
        .select("exercise_id, completed_at")
        .in("session_id", sessionIds)
        .order("completed_at", { ascending: false })
        .limit(200);
      const seen = new Set<string>();
      const ids: string[] = [];
      for (const s of sets ?? []) {
        if (!seen.has(s.exercise_id)) {
          seen.add(s.exercise_id);
          ids.push(s.exercise_id);
        }
      }
      setRecentIds(ids.slice(0, 10));
    })();
  }, [userId]);

  const filtered = useMemo(() => exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesMuscle = muscleFilter === "all" || ex.muscle_group === muscleFilter;
    return matchesSearch && matchesMuscle;
  }), [exercises, search, muscleFilter]);

  // When searching or filtering, show flat sorted list; otherwise show sections
  const isFiltering = search.trim() !== "" || muscleFilter !== "all";

  const recentExercises = useMemo(() =>
    !isFiltering
      ? filtered.filter((ex) => recentIds.includes(ex.id)).sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id))
      : [],
    [isFiltering, filtered, recentIds]
  );
  const customExercises = useMemo(() =>
    !isFiltering
      ? filtered.filter((ex) => ex.is_custom && !recentIds.includes(ex.id))
      : [],
    [isFiltering, filtered, recentIds]
  );
  const allExercises = useMemo(() =>
    !isFiltering
      ? filtered.filter((ex) => !ex.is_custom && !recentIds.includes(ex.id))
      : filtered,
    [isFiltering, filtered, recentIds]
  );

  function goBack() {
    setView("list");
    setDetailExercise(null);
    setConfirmDelete(false);
  }

  function toggleSelect(ex: Exercise) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(ex.id)) next.delete(ex.id);
      else next.add(ex.id);
      return next;
    });
  }

  function confirmSelection() {
    const chosen = exercises.filter((ex) => selectedIds.has(ex.id));
    onSelect?.(chosen);
    setSelectedIds(new Set());
  }

  function ExerciseCard({ ex }: { ex: Exercise }) {
    const isSelected = selectedIds.has(ex.id);
    return (
      <Card
        className={cn(
          "cursor-pointer transition-colors",
          selectable
            ? isSelected
              ? "bg-primary/10 border-primary/40 hover:bg-primary/15"
              : "hover:bg-muted/50 active:bg-muted"
            : "hover:bg-muted/50 active:bg-muted",
        )}
        onClick={() => {
          if (selectable) toggleSelect(ex);
          else { setDetailExercise(ex); setView("detail"); }
        }}
      >
        <CardContent className="flex items-center gap-3 py-3">
          <div className="shrink-0 w-10 h-10 rounded overflow-hidden bg-muted flex items-center justify-center relative">
            {ex.gif_url ? (
              <Image
                src={ex.gif_url}
                alt={ex.name}
                width={40}
                height={40}
                loading="lazy"
                sizes="40px"
                unoptimized
                className="object-cover w-full h-full"
              />
            ) : (
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
            )}
            {isSelected && (
              <div className="absolute inset-0 bg-primary/80 flex items-center justify-center">
                <Check className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{ex.name}</p>
            <p className="text-xs text-muted-foreground">
              {muscleLabel(ex.muscle_group)}{" · "}{EQUIPMENT_TYPES.find(e => e.value === ex.equipment_type)?.label ?? ex.equipment_type}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="outline" className="text-xs hidden sm:inline-flex">
              {LOG_TYPES.find(t => t.value === ex.log_type)?.label ?? ex.log_type}
            </Badge>
            {ex.is_custom && <Badge variant="secondary" className="text-xs">Custom</Badge>}
            <button
              type="button"
              className="ml-1 p-1 rounded-md hover:bg-muted text-muted-foreground"
              aria-label={`View details for ${ex.name}`}
              onClick={(e) => { e.stopPropagation(); setDetailExercise(ex); setView("detail"); }}
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  async function handleAddExercise(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("exercises")
      .insert({
        name: newName,
        muscle_group: newMuscle,
        equipment_type: newEquipment,
        log_type: newLogType,
        gif_url: newGifUrl.trim() || null,
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
      setNewGifUrl("");
      setView("list");
      toast.success(`${data.name} added!`);
    }
    setSaving(false);
  }

  function openEdit(ex: Exercise) {
    setNewName(ex.name);
    setNewMuscle(ex.muscle_group);
    setNewEquipment(ex.equipment_type);
    setNewLogType(ex.log_type);
    setNewGifUrl(ex.gif_url ?? "");
    setDetailExercise(ex);
    setView("edit");
  }

  async function handleUpdateExercise(e: React.FormEvent) {
    e.preventDefault();
    if (!detailExercise) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("exercises")
      .update({
        name: newName,
        muscle_group: newMuscle,
        equipment_type: newEquipment,
        gif_url: newGifUrl.trim() || null,
      })
      .eq("id", detailExercise.id)
      .select()
      .single();
    if (error) {
      toast.error("Failed to update exercise");
    } else {
      setExercises((prev) =>
        prev.map((ex) => (ex.id === data.id ? data : ex)).sort((a, b) => a.name.localeCompare(b.name))
      );
      setDetailExercise(data);
      setView("detail");
      toast.success(`${data.name} updated!`);
    }
    setSaving(false);
  }

  async function handleDeleteExercise(ex: Exercise) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("exercises").delete().eq("id", ex.id);
    if (error) {
      toast.error("Failed to delete exercise");
    } else {
      setExercises((prev) => prev.filter((e) => e.id !== ex.id));
      setConfirmDelete(false);
      goBack();
      toast.success(`${ex.name} deleted`);
    }
    setSaving(false);
  }
  if (view === "detail" && detailExercise) {
    const ex = detailExercise;
    const isSelected = selectedIds.has(ex.id);
    return (
      <div className="flex flex-col h-full">
        {/* Sub-header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
          <Button variant="ghost" size="icon-sm" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium text-sm truncate flex-1">{ex.name}</span>
          {ex.is_custom && (
            <>
              <Button variant="ghost" size="icon-sm" onClick={() => openEdit(ex)}>
                <Pencil className="h-4 w-4" />
              </Button>
              {confirmDelete ? (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={saving}
                  onClick={() => handleDeleteExercise(ex)}
                >
                  {saving ? "Deleting…" : "Confirm delete"}
                </Button>
              ) : (
                <Button variant="ghost" size="icon-sm" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {ex.gif_url ? (
            <Image
              src={ex.gif_url}
              alt={ex.name}
              width={400}
              height={400}
              loading="lazy"
              sizes="(max-width: 768px) 100vw, 400px"
              unoptimized
              className="rounded-xl object-contain w-full max-h-64"
            />
          ) : (
            <div className="rounded-xl bg-muted flex items-center justify-center h-48">
              <Dumbbell className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
          <div className="rounded-xl border divide-y text-sm">
            <div className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">Muscle</span>
              <span className="font-medium">{muscleLabel(ex.muscle_group)}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">Equipment</span>
              <span className="font-medium">{EQUIPMENT_TYPES.find(e => e.value === ex.equipment_type)?.label ?? ex.equipment_type}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-muted-foreground">Exercise type</span>
              <span className="font-medium">{LOG_TYPES.find(t => t.value === ex.log_type)?.label ?? ex.log_type}</span>
            </div>
            {ex.is_custom && (
              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground">Source</span>
                <span className="font-medium">Custom</span>
              </div>
            )}
          </div>
        </div>
        {/* Sticky select button — only in selectable mode */}
        {selectable && (
          <div className="shrink-0 px-4 pt-3 pb-6 bg-background shadow-[0_-8px_16px_-4px_hsl(var(--background))]">
            <Button
              className="w-full"
              variant={isSelected ? "secondary" : "default"}
              onClick={() => toggleSelect(ex)}
            >
              {isSelected ? <><Check className="h-4 w-4 mr-2" />Selected — tap to remove</> : "Add to Workout"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ── Edit custom exercise view ─────────────────────────────────────────────
  if (view === "edit" && detailExercise) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
          <Button variant="ghost" size="icon-sm" onClick={() => setView("detail")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium text-sm">Edit Exercise</span>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-safe">
          <form onSubmit={handleUpdateExercise} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Cable Curl" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-muscle">Muscle Group</Label>
              <Select value={newMuscle} onValueChange={(v) => setNewMuscle(v as MuscleGroup)}>
                <SelectTrigger id="edit-muscle"><span>{muscleLabel(newMuscle)}</span></SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.map((m) => (
                    <SelectItem key={m} value={m}>{muscleLabel(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-equipment">Equipment</Label>
              <Select value={newEquipment} onValueChange={(v) => setNewEquipment(v as EquipmentType)}>
                <SelectTrigger id="edit-equipment"><span>{EQUIPMENT_TYPES.find(e => e.value === newEquipment)?.label}</span></SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_TYPES.map((e) => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Exercise Type</Label>
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm bg-muted/40">
                <span>{LOG_TYPES.find(t => t.value === detailExercise.log_type)?.label ?? detailExercise.log_type}</span>
                <span className="text-xs text-muted-foreground">locked</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-gif-url">Image URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="edit-gif-url"
                value={newGifUrl}
                onChange={(e) => setNewGifUrl(e.target.value)}
                placeholder="https://… (GIF or image URL)"
                type="url"
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ── Add custom exercise view ──────────────────────────────────────────────
  if (view === "add") {
    return (
      <div className="flex flex-col h-full">
        {/* Sub-header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
          <Button variant="ghost" size="icon-sm" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium text-sm">New Exercise</span>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-safe">
          <form onSubmit={handleAddExercise} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Name</Label>
              <Input id="add-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Cable Curl" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-muscle">Muscle Group</Label>
              <Select value={newMuscle} onValueChange={(v) => setNewMuscle(v as MuscleGroup)}>
                <SelectTrigger id="add-muscle"><span>{muscleLabel(newMuscle)}</span></SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.map((m) => (
                    <SelectItem key={m} value={m}>{muscleLabel(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-equipment">Equipment</Label>
              <Select value={newEquipment} onValueChange={(v) => setNewEquipment(v as EquipmentType)}>
                <SelectTrigger id="add-equipment"><span>{EQUIPMENT_TYPES.find(e => e.value === newEquipment)?.label}</span></SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_TYPES.map((e) => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-log-type">Exercise Type</Label>
              <Select value={newLogType} onValueChange={(v) => setNewLogType(v as LogType)}>
                <SelectTrigger id="add-log-type"><span>{LOG_TYPES.find(t => t.value === newLogType)?.label}</span></SelectTrigger>
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
              <Label htmlFor="add-gif-url">Image URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="add-gif-url"
                value={newGifUrl}
                onChange={(e) => setNewGifUrl(e.target.value)}
                placeholder="https://… (GIF or image URL)"
                type="url"
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Adding…" : "Add Exercise"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ── Exercise list view (default) ─────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Search + add button */}
      <div className="flex gap-2 px-4 pt-3 pb-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={() => setView("add")}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Muscle group filter */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide shrink-0">
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

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto px-4 pb-safe">
        {exercises.length === 0 && search.trim() === "" ? (
          <p className="text-muted-foreground text-sm text-center py-8">No exercises found.</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No exercises found.</p>
        ) : isFiltering ? (
          <div className="space-y-1 py-2">
            {allExercises.map((ex) => <ExerciseCard key={ex.id} ex={ex} />)}
          </div>
        ) : (
          <div className="pb-4">
            {recentExercises.length > 0 && (
              <Section label="Recent">
                {recentExercises.map((ex) => <ExerciseCard key={ex.id} ex={ex} />)}
              </Section>
            )}
            {customExercises.length > 0 && (
              <Section label="My Exercises">
                {customExercises.map((ex) => <ExerciseCard key={ex.id} ex={ex} />)}
              </Section>
            )}
            {allExercises.length > 0 && (
              <Section label="All Exercises">
                {allExercises.map((ex) => <ExerciseCard key={ex.id} ex={ex} />)}
              </Section>
            )}
          </div>
        )}
      </div>

      {/* Sticky confirm button — selectable mode only */}
      {selectable && selectedIds.size > 0 && (
        <div className="shrink-0 px-4 pt-3 pb-6 bg-background shadow-[0_-8px_16px_-4px_hsl(var(--background))]">
          <Button className="w-full" onClick={confirmSelection}>
            Add {selectedIds.size} Exercise{selectedIds.size !== 1 ? "s" : ""}
          </Button>
        </div>
      )}
    </div>
  );
}
