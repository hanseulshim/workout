"use client";

import { useState } from "react";
import { Check, Play, Plus, Square, Timer, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExerciseEditorCard } from "@/components/workout/exercise-editor-card";
import { WorkoutNotesInput } from "@/components/workout/workout-notes-input";
import type { ActiveExercise, ActiveSet } from "@/store/workout-store";
import type { LogType } from "@/types/database";

const REST_PRESETS = [
  { label: "30s", seconds: 30 },
  { label: "1m", seconds: 60 },
  { label: "1:30", seconds: 90 },
  { label: "2m", seconds: 120 },
  { label: "3m", seconds: 180 },
];

interface ActiveWorkoutExerciseCardProps {
  exercise: ActiveExercise;
  invalidSetIds: Set<string>;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onUpdateSet: (setId: string, updates: Partial<ActiveSet>) => void;
  onToggleComplete: (setId: string) => void;
  onRemoveExercise: () => void;
  onSetRestTime: (seconds: number) => void;
  onStartRest: (seconds: number) => void;
  onSetNotes: (notes: string) => void;
  onUnlinkSuperset?: () => void;
}

function nowMs() {
  return Date.now();
}

/** "300" → "5:00", "90" → "1:30", "45" → "0:45" */
function secondsToDisplay(raw: string): string {
  const n = Number.parseInt(raw, 10);
  if (!raw || Number.isNaN(n) || n < 0) return raw;
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}

/** "5:00" → "300", "1:30" → "90", "45" → "45", "5" → "5" */
function displayToSeconds(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes(":")) {
    const [mins, secs] = trimmed.split(":").map((p) => Number.parseInt(p, 10) || 0);
    return String(mins * 60 + secs);
  }
  return trimmed;
}

function formatRest(seconds: number) {
  if (seconds === 0) return "Off";
  return seconds < 60
    ? `${seconds}s`
    : seconds % 60 === 0
      ? `${seconds / 60}m`
      : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function ActiveWorkoutExerciseCard({
  exercise,
  invalidSetIds,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onToggleComplete,
  onRemoveExercise,
  onSetRestTime,
  onStartRest,
  onSetNotes,
  onUnlinkSuperset,
}: ActiveWorkoutExerciseCardProps) {
  const [showRestPicker, setShowRestPicker] = useState(false);
  const [durationTimers, setDurationTimers] = useState<Record<string, number>>({});
  const completedCount = exercise.sets.filter((setItem) => setItem.completed).length;

  function handleDurationTimer(setId: string) {
    const startedAt = durationTimers[setId];
    if (startedAt) {
      const elapsed = Math.max(1, Math.round((nowMs() - startedAt) / 1000));
      setDurationTimers((prev) => {
        const next = { ...prev };
        delete next[setId];
        return next;
      });
      onUpdateSet(setId, { durationSeconds: String(elapsed) });
      return;
    }

    setDurationTimers((prev) => ({ ...prev, [setId]: nowMs() }));
  }

  return (
    <ExerciseEditorCard
      id={exercise.exerciseId}
      name={exercise.exerciseName}
      gifUrl={exercise.gifUrl}
      supersetId={exercise.supersetId}
      setsCount={exercise.sets.length}
      completedCount={completedCount}
      onRemove={onRemoveExercise}
      onUnlinkSuperset={onUnlinkSuperset}
      footer={
        showRestPicker ? (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="shrink-0 text-xs text-muted-foreground">Rest timer:</span>
              {[{ label: "Off", seconds: 0 }, ...REST_PRESETS].map((preset) => (
                <button
                  key={preset.seconds}
                  type="button"
                  onClick={() => {
                    onSetRestTime(preset.seconds);
                    if (preset.seconds > 0) onStartRest(preset.seconds);
                    setShowRestPicker(false);
                  }}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs transition-colors",
                    exercise.restSeconds === preset.seconds
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowRestPicker(false)}
                className="ml-auto text-xs text-muted-foreground"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onAddSet}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Set
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRestPicker(true)}
              className={cn(exercise.restSeconds > 0 && "border-primary/50 text-primary")}
            >
              <Timer className="mr-1 h-3.5 w-3.5" />
              {formatRest(exercise.restSeconds)}
            </Button>
            {exercise.sets.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => onRemoveSet(exercise.sets[exercise.sets.length - 1].id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )
      }
    >
      <SetColumnHeaders logType={exercise.logType} />
      {exercise.sets.map((setItem) => (
        <SetRow
          key={setItem.id}
          set={setItem}
          logType={exercise.logType}
          invalid={invalidSetIds.has(setItem.id)}
          timerRunning={Boolean(durationTimers[setItem.id])}
          onUpdate={(updates) => onUpdateSet(setItem.id, updates)}
          onToggleComplete={() => onToggleComplete(setItem.id)}
          onToggleDurationTimer={exercise.logType === "duration" ? () => handleDurationTimer(setItem.id) : undefined}
        />
      ))}
      <WorkoutNotesInput value={exercise.notes} onChange={onSetNotes} />
    </ExerciseEditorCard>
  );
}

function SetColumnHeaders({ logType }: { logType: LogType }) {
  if (logType === "duration") {
    return (
      <div className="grid grid-cols-[32px_1fr_36px_48px] gap-2 px-1">
        <span className="text-center text-xs text-muted-foreground">Set</span>
        <span className="text-center text-xs text-muted-foreground">Duration</span>
        <span />
        <span />
      </div>
    );
  }

  if (logType === "bodyweight_reps") {
    return (
      <div className="grid grid-cols-[32px_1fr_48px] gap-2 px-1">
        <span className="text-center text-xs text-muted-foreground">Set</span>
        <span className="text-center text-xs text-muted-foreground">Reps</span>
        <span />
      </div>
    );
  }

  const weightLabel = logType === "weighted_bodyweight" ? "+Weight" : logType === "assisted_bodyweight" ? "Assist" : "Weight";

  return (
    <div className="grid grid-cols-[32px_1fr_1fr_48px] gap-2 px-1">
      <span className="text-center text-xs text-muted-foreground">Set</span>
      <span className="text-center text-xs text-muted-foreground">{weightLabel}</span>
      <span className="text-center text-xs text-muted-foreground">Reps</span>
      <span />
    </div>
  );
}

function SetRow({
  set,
  logType,
  invalid,
  timerRunning,
  onUpdate,
  onToggleComplete,
  onToggleDurationTimer,
}: {
  set: ActiveSet;
  logType: LogType;
  invalid: boolean;
  timerRunning: boolean;
  onUpdate: (updates: Partial<ActiveSet>) => void;
  onToggleComplete: () => void;
  onToggleDurationTimer?: () => void;
}) {
  const rowClass = cn(
    "grid items-center gap-2 rounded-lg px-1 py-1 transition-colors",
    set.completed && "bg-primary/10",
  );
  const inputClass = cn(
    "h-9 text-center text-sm",
    invalid && "border-destructive ring-1 ring-destructive/20",
  );

  const checkButton = (
    <button
      type="button"
      onClick={onToggleComplete}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
        set.completed ? "bg-primary text-primary-foreground" : "border border-input hover:bg-muted",
      )}
    >
      <Check className="h-4 w-4" />
    </button>
  );

  if (logType === "duration") {
    return (
      <div className={cn(rowClass, "grid-cols-[32px_1fr_36px_48px]")}>
        <span className="text-center text-xs font-medium tabular-nums">{set.setNumber}</span>
        <Input
          type="text"
          inputMode="numeric"
          placeholder="0:00"
          value={secondsToDisplay(set.durationSeconds)}
          onChange={(event) => onUpdate({ durationSeconds: displayToSeconds(event.target.value) })}
          onFocus={(event) => event.target.select()}
          className={inputClass}
        />
        <button
          type="button"
          onClick={onToggleDurationTimer}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border border-input transition-colors hover:bg-muted",
            timerRunning && "border-primary text-primary",
          )}
          aria-label={timerRunning ? "Stop stopwatch" : "Start stopwatch"}
        >
          {timerRunning ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        {checkButton}
      </div>
    );
  }

  if (logType === "bodyweight_reps") {
    return (
      <div className={cn(rowClass, "grid-cols-[32px_1fr_48px]")}>
        <span className="text-center text-xs font-medium tabular-nums">{set.setNumber}</span>
        <Input
          type="text"
          inputMode="numeric"
          placeholder="0"
          value={set.reps}
          onChange={(event) => onUpdate({ reps: event.target.value })}
          onFocus={(event) => event.target.select()}
          className={inputClass}
        />
        {checkButton}
      </div>
    );
  }

  return (
    <div className={cn(rowClass, "grid-cols-[32px_1fr_1fr_48px]")}>
      <span className="text-center text-xs font-medium tabular-nums">{set.setNumber}</span>
      <Input
        type="text"
        inputMode="decimal"
        placeholder="0"
        value={set.weight}
        onChange={(event) => onUpdate({ weight: event.target.value })}
        onFocus={(event) => event.target.select()}
        className={inputClass}
      />
      <Input
        type="text"
        inputMode="numeric"
        placeholder="0"
        value={set.reps}
        onChange={(event) => onUpdate({ reps: event.target.value })}
        onFocus={(event) => event.target.select()}
        className={inputClass}
      />
      {checkButton}
    </div>
  );
}
