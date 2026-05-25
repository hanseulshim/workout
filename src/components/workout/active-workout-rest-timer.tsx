"use client";

import { Pause, Play, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardContent className="flex items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Rest</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold tabular-nums text-primary">
            {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}
          </span>
          <Button size="sm" variant="ghost" onClick={onTogglePause}>
            {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={onStop}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
