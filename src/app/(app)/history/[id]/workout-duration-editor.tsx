"use client";

import { useState, useRef, useEffect } from "react";
import { Clock, Pencil, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { updateWorkoutFinishedAt } from "./actions";

interface Props {
  sessionId: string;
  startedAt: string;
  finishedAt: string | null;
  initialDurationMin: number | null;
}

export function WorkoutDurationEditor({ sessionId, startedAt, finishedAt, initialDurationMin }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialDurationMin?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function handleEdit() {
    setValue(initialDurationMin?.toString() ?? "");
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
  }

  async function handleSave() {
    const mins = parseInt(value, 10);
    if (isNaN(mins) || mins <= 0) {
      toast.error("Enter a valid duration in minutes.");
      return;
    }
    setSaving(true);
    try {
      const newFinishedAt = new Date(new Date(startedAt).getTime() + mins * 60 * 1000).toISOString();
      await updateWorkoutFinishedAt(sessionId, newFinishedAt);
      setEditing(false);
      toast.success("Duration updated.");
    } catch {
      toast.error("Failed to update duration.");
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") void handleSave();
    if (e.key === "Escape") handleCancel();
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Clock className="h-3 w-3 text-muted-foreground" />
        <input
          ref={inputRef}
          type="number"
          min="1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-16 rounded border border-input bg-background px-1.5 py-0.5 text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={saving}
        />
        <span className="text-xs text-muted-foreground">min</span>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded p-0.5 text-primary hover:bg-primary/10 transition-colors"
          aria-label="Save"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={handleEdit} className="group flex items-center gap-0.5">
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {initialDurationMin !== null ? `${initialDurationMin} min` : "Set duration"}
      </Badge>
      <Pencil className="ml-0.5 h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
