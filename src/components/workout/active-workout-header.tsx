"use client";

import { Pause, Play, ChevronLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

function formatElapsed(startedAt: string, now: number | null, totalPausedMs: number): string {
  const startMs = new Date(startedAt).getTime();
  const elapsedMs = Math.max(0, (now ?? Date.now()) - startMs - totalPausedMs);
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
  totalPausedMs: number;
  paused: boolean;
  finishing: boolean;
  completedSets: number;
  totalSets: number;
  progress: number;
  onDiscard: () => void;
  onFinishClick: () => void;
  onPauseToggle: () => void;
  onMinimize: () => void;
}

export function ActiveWorkoutHeader({
  name,
  startedAt,
  now,
  totalPausedMs,
  paused,
  finishing,
  completedSets,
  totalSets,
  progress,
  onDiscard,
  onFinishClick,
  onPauseToggle,
  onMinimize,
}: ActiveWorkoutHeaderProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onMinimize} aria-label="Minimize workout">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold leading-tight">{name}</h1>
            <p className="text-xs tabular-nums text-muted-foreground leading-none mt-0.5">
              {formatElapsed(startedAt, now, totalPausedMs)}
              {paused && <span className="ml-1 text-amber-500 font-medium">· Paused</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={onDiscard}
            aria-label="Discard workout"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onPauseToggle}
            aria-label={paused ? "Resume workout" : "Pause workout"}
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            className="h-9 px-4 font-semibold"
            onClick={onFinishClick}
            disabled={finishing || completedSets === 0}
          >
            {finishing ? "Saving…" : "Finish"}
          </Button>
        </div>
      </div>

      {totalSets > 0 && (
        <div className="space-y-1">
          <Progress value={progress} className="h-1.5" />
          <div className="flex justify-between items-center text-[10px] text-muted-foreground">
            <span>Progress</span>
            <span>{completedSets}/{totalSets} sets ({Math.round(progress)}%)</span>
          </div>
        </div>
      )}
    </>
  );
}
