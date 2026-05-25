"use client";

import { Input } from "@/components/ui/input";
import type { SelectedExercise, SetTarget } from "./routine-builder-types";

interface Props {
  ex: SelectedExercise;
  exIdx: number;
  onUpdate: (exIdx: number, setIdx: number, updates: Partial<SetTarget>) => void;
}

export function RoutineExerciseSetTargets({ ex, exIdx, onUpdate }: Props) {
  const showWeight = ["weight_reps", "weighted_bodyweight", "assisted_bodyweight"].includes(ex.logType);
  const showReps = ex.logType !== "duration";
  const weightLabel = ex.logType === "weighted_bodyweight" ? "+Weight" : ex.logType === "assisted_bodyweight" ? "Assist" : "Weight";
  const colClass = showWeight && showReps ? "grid-cols-[2rem_1fr_1fr_2rem]" : "grid-cols-[2rem_1fr_2rem]";

  return (
    <div className="space-y-1.5">
      <div className={`grid ${colClass} gap-2 px-1`}>
        <span className="text-xs text-muted-foreground text-center">Set</span>
        {showWeight && <span className="text-xs text-muted-foreground text-center">{weightLabel}</span>}
        <span className="text-xs text-muted-foreground text-center">{ex.logType === "duration" ? "Secs" : "Reps"}</span>
      </div>
      {ex.sets.map((set, setIdx) => (
        <div key={setIdx} className={`grid ${colClass} gap-2 items-center`}>
          <span className="text-xs font-medium text-center text-muted-foreground">{setIdx + 1}</span>
          {showWeight && (
            <Input
              type="text"
              inputMode="decimal"
              placeholder="—"
              value={set.weight ?? ""}
              onChange={(e) => onUpdate(exIdx, setIdx, { weight: e.target.value })}
              onFocus={(e) => e.target.select()}
              className="h-8 text-sm text-center"
            />
          )}
          {(showReps || ex.logType === "duration") && (
            <Input
              type="text"
              inputMode="numeric"
              placeholder="—"
              value={set.reps}
              onChange={(e) => onUpdate(exIdx, setIdx, { reps: e.target.value })}
              onFocus={(e) => e.target.select()}
              className="h-8 text-sm text-center"
            />
          )}
          <span className="w-6" />
        </div>
      ))}
    </div>
  );
}
