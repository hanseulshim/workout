"use client";

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

interface FinishWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  completedSets: number;
  finishing: boolean;
  onConfirm: () => void;
}

export function FinishWorkoutDialog({
  open,
  onOpenChange,
  completedSets,
  finishing,
  onConfirm,
}: FinishWorkoutDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Finish workout?</AlertDialogTitle>
          <AlertDialogDescription>
            This will save {completedSets} completed set{completedSets === 1 ? "" : "s"} and close the workout.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={finishing}>Keep logging</AlertDialogCancel>
          <AlertDialogAction disabled={finishing} onClick={onConfirm}>
            {finishing ? "Saving…" : "Finish workout"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
