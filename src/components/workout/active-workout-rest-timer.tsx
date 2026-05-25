"use client";

import { Pause, Play, SkipForward, Timer } from "lucide-react";

interface ActiveWorkoutRestTimerProps {
  remainingSeconds: number;
  paused: boolean;
  onTogglePause: () => void;
  onStop: () => void;
}

export function ActiveWorkoutRestTimer({
  remainingSeconds,
  paused,
  onTogglePause,
  onStop,
}: ActiveWorkoutRestTimerProps) {
  const pct = 0; // visual only — could add total seconds prop later
  void pct;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 md:left-auto md:right-6 md:w-56">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Rest</span>
        </div>
        <span className="text-xl font-bold tabular-nums text-primary">
          {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onTogglePause}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
            aria-label={paused ? "Resume" : "Pause"}
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onStop}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80"
            aria-label="Skip rest"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
