"use client";

import { Plus } from "lucide-react";
import { ExerciseList } from "@/components/exercises/exercise-list";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/types/database";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: Exercise[];
  userId: string;
  onSelect: (exercises: Exercise[]) => void;
}

export function RoutineExercisePickerSheet({ open, onOpenChange, exercises, userId, onSelect }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
        <Plus className="h-4 w-4 mr-2" />
        Add Exercise
      </SheetTrigger>
      <SheetContent side="bottom" className="flex flex-col h-dvh p-0">
        <SheetHeader className="px-4 pt-4 pb-2 shrink-0 border-b">
          <SheetTitle>Add Exercise</SheetTitle>
        </SheetHeader>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <ExerciseList exercises={exercises} userId={userId} selectable onSelect={onSelect} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
