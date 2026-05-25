"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ExerciseList } from "@/components/exercises/exercise-list";
import type { Exercise } from "@/types/database";

interface AddExerciseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: Exercise[];
  onSelect: (selectedExercises: Exercise[]) => void;
}

export function AddExerciseSheet({
  open,
  onOpenChange,
  exercises,
  onSelect,
}: AddExerciseSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
        <Plus className="mr-2 h-4 w-4" />
        Add Exercise
      </SheetTrigger>
      <SheetContent side="bottom" className="flex h-dvh flex-col p-0">
        <SheetHeader className="shrink-0 border-b px-4 pt-4 pb-2">
          <SheetTitle>Add Exercise</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ExerciseList exercises={exercises} userId="" selectable onSelect={onSelect} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
