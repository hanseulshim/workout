"use client";

import { Pause, Play, SkipForward, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const urgent = !paused && remainingSeconds <= 5 && remainingSeconds > 0;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 md:left-auto md:right-6 md:w-56">
      <div className={cn(
        "flex items-center justify-between gap-3 rounded-2xl border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm transition-colors duration-300",
        urgent ? "border-destructive/60" : "border-primary/40",
      )}>
        <div className="flex items-center gap-2">
          <Timer className={cn("h-4 w-4 shrink-0 transition-colors", urgent ? "text-destructive" : "text-primary")} />
          <span className="text-xs font-medium text-muted-foreground">Rest</span>
        </div>
        <span className={cn(
          "text-xl font-bold tabular-nums transition-colors",
          urgent ? "text-destructive animate-pulse" : "text-primary",
        )}>
          {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onTogglePause}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
              urgent
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "bg-primary/10 text-primary hover:bg-primary/20",
            )}
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
