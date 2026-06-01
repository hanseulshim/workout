"use client";

import { Pause, Play, X } from "lucide-react";
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
}: ActiveWorkoutHeaderProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="max-w-[180px] truncate text-lg font-bold">{name}</h1>
          <p className="text-xs tabular-nums text-muted-foreground">
            {formatElapsed(startedAt, now, totalPausedMs)}
            {paused && <span className="ml-1 text-warning">· Paused</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onDiscard}>
            <X className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onPauseToggle} aria-label={paused ? "Resume workout" : "Pause workout"}>
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
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
