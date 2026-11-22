"use client";

import { useState } from "react";
import { useWorkoutStore } from "@/store/workout-store";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Dumbbell, Trash2, ChevronRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ActiveWorkoutBanner() {
  const { activeWorkout, endWorkout } = useWorkoutStore();
  const router = useRouter();
  const pathname = usePathname();
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  if (!activeWorkout) return null;
  // Already on this workout's page — no need to show the banner
  if (activeWorkout.sessionId && pathname === `/workout/${activeWorkout.sessionId}`) return null;

  async function handleDiscard() {
    if (!activeWorkout || discarding) return;
    setDiscarding(true);
    try {
      if (activeWorkout.sessionId) {
        const supabase = createClient();
        await supabase.from("workout_sessions").delete().eq("id", activeWorkout.sessionId);
      }
    } catch (error) {
      console.error("Failed to delete workout session from DB:", error);
    } finally {
      endWorkout();
      setDiscarding(false);
      setDiscardConfirmOpen(false);
    }
  }

  return (
    <>
      <AlertDialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard workout?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to discard this active workout? All logged sets and progress from this session will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={discarding}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDiscard}
              disabled={discarding}
            >
              {discarding ? "Discarding…" : "Discard Workout"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between gap-2 text-sm">
        <button
          type="button"
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
          onClick={() => router.push(`/workout/${activeWorkout.sessionId}`)}
        >
          <Dumbbell className="h-4 w-4 shrink-0 animate-pulse" />
          <span className="font-medium truncate">{activeWorkout.name}</span>
          <span className="text-primary-foreground/70 text-xs shrink-0">in progress</span>
          <ChevronRight className="h-4 w-4 shrink-0 ml-auto" />
        </button>
        <button
          type="button"
          onClick={() => setDiscardConfirmOpen(true)}
          disabled={discarding}
          className="shrink-0 p-1 rounded hover:bg-primary-foreground/20 transition-colors disabled:opacity-50"
          aria-label="Discard workout"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
