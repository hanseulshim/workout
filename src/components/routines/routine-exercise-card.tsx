"use client";

import { Trash2, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExerciseEditorCard } from "@/components/workout/exercise-editor-card";
import type { SelectedExercise, SetTarget } from "./routine-builder-types";
import { RoutineExerciseSetTargets } from "./routine-exercise-set-targets";

const REST_PRESETS = [
  { label: "Off", seconds: 0 },
  { label: "30s", seconds: 30 },
  { label: "1m", seconds: 60 },
  { label: "1:30", seconds: 90 },
  { label: "2m", seconds: 120 },
  { label: "3m", seconds: 180 },
];

interface Props {
  ex: SelectedExercise;
  exIdx: number;
  onUpdate: (exIdx: number, setIdx: number, updates: Partial<SetTarget>) => void;
  onAddSet: (id: string) => void;
  onRemoveSet: (id: string, setIdx: number) => void;
  onRemove: (id: string) => void;
  onUnlink: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateRestSeconds: (id: string, seconds: number) => void;
}

export function RoutineExerciseCard({
  ex,
  exIdx,
  onUpdate,
  onAddSet,
  onRemoveSet,
  onRemove,
  onUnlink,
  onUpdateNotes,
  onUpdateRestSeconds,
}: Props) {
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
        <div className="space-y-2">
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Timer className="h-3 w-3" />Rest:
            </span>
            {REST_PRESETS.map((preset) => (
              <button
                key={preset.seconds}
                type="button"
                onClick={() => onUpdateRestSeconds(ex.exerciseId, preset.seconds)}
                className={cn(
                  "text-xs px-2 py-0.5 rounded border transition-colors",
                  ex.restSeconds === preset.seconds
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted border-input"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <textarea
            value={ex.notes}
            onChange={(e) => onUpdateNotes(ex.exerciseId, e.target.value)}
            placeholder="Notes (e.g. cues, rep range, tempo)"
            rows={1}
            className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            style={{ minHeight: "2.25rem" }}
            onInput={(e) => {
              const textarea = e.currentTarget;
              textarea.style.height = "auto";
              textarea.style.height = `${textarea.scrollHeight}px`;
            }}
          />
        </div>
      }
    >
      <RoutineExerciseSetTargets ex={ex} exIdx={exIdx} onUpdate={onUpdate} />
    </ExerciseEditorCard>
  );
}
