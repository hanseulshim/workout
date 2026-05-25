"use client";

import { useWorkoutStore } from "@/store/workout-store";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Dumbbell, X, ChevronRight } from "lucide-react";

export function ActiveWorkoutBanner() {
  const { activeWorkout, endWorkout } = useWorkoutStore();
  const router = useRouter();

  if (!activeWorkout) return null;

  async function handleDiscard() {
    if (!activeWorkout) return;
    const supabase = createClient();
    if (activeWorkout.sessionId) {
      await supabase.from("workout_sessions").delete().eq("id", activeWorkout.sessionId);
    }
    endWorkout();
  }

  return (
    <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between gap-2 text-sm">
      <button
        className="flex items-center gap-2 flex-1 min-w-0 text-left"
        onClick={() => router.push(`/workout/${activeWorkout.sessionId}`)}
      >
        <Dumbbell className="h-4 w-4 shrink-0 animate-pulse" />
        <span className="font-medium truncate">{activeWorkout.name}</span>
        <span className="text-primary-foreground/70 text-xs shrink-0">in progress</span>
        <ChevronRight className="h-4 w-4 shrink-0 ml-auto" />
      </button>
      <button
        onClick={handleDiscard}
        className="shrink-0 p-1 rounded hover:bg-primary-foreground/20 transition-colors"
        aria-label="Discard workout"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
