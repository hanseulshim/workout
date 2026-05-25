"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { WeightUnit } from "@/types/database";

function formatElapsed(startedAt: string, now: number | null): string {
  const startMs = new Date(startedAt).getTime();
  const elapsedMs = Math.max(0, (now ?? Date.now()) - startMs);
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

interface ActiveWorkoutHeaderProps {
  name: string;
  startedAt: string;
  now: number | null;
  defaultWeightUnit: WeightUnit;
  finishing: boolean;
  completedSets: number;
  totalSets: number;
  progress: number;
  onWeightUnitToggle: (unit: WeightUnit) => void;
  onDiscard: () => void;
  onFinishClick: () => void;
}

export function ActiveWorkoutHeader({
  name,
  startedAt,
  now,
  defaultWeightUnit,
  finishing,
  completedSets,
  totalSets,
  progress,
  onWeightUnitToggle,
  onDiscard,
  onFinishClick,
}: ActiveWorkoutHeaderProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="max-w-[180px] truncate text-lg font-bold">{name}</h1>
          <p className="text-xs tabular-nums text-muted-foreground">
            {formatElapsed(startedAt, now)}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex overflow-hidden rounded-md border">
            {(["lbs", "kg"] as WeightUnit[]).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => onWeightUnitToggle(unit)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium uppercase transition-colors",
                  defaultWeightUnit === unit ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground",
                )}
              >
                {unit}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={onDiscard}>
            <X className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={onFinishClick} disabled={finishing || completedSets === 0}>
            {finishing ? "Saving…" : "Finish"}
          </Button>
        </div>
      </div>

      {totalSets > 0 && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-right text-xs text-muted-foreground">
            {completedSets}/{totalSets} sets
          </p>
        </div>
      )}
    </>
  );
}
