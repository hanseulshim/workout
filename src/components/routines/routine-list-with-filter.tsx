"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Play } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Routine {
  id: string;
  name: string;
  days: number[];
  exerciseCount: number;
}

interface Props {
  routines: Routine[];
  today: number;
}

export function RoutineListWithFilter({ routines, today }: Props) {
  const [activeDay, setActiveDay] = useState<number | null>(null);

  const filtered = activeDay === null
    ? routines
    : routines.filter((r) => r.days.includes(activeDay));

  return (
    <div className="space-y-3">
      {/* Day filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        {DAY_LABELS.map((label, i) => {
          const isToday = i === today;
          const isActive = activeDay === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActiveDay(isActive ? null : i)}
              className={cn(
                "h-8 rounded-full border px-3 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : isToday
                  ? "border-primary text-primary hover:bg-primary/10"
                  : "border-input hover:bg-muted"
              )}
            >
              {label}
              {isToday && !isActive && <span className="ml-1 inline-block h-1 w-1 rounded-full bg-primary align-middle" />}
            </button>
          );
        })}
        {activeDay !== null && (
          <button
            type="button"
            onClick={() => setActiveDay(null)}
            className="h-8 rounded-full border border-input px-3 text-xs text-muted-foreground hover:bg-muted"
          >
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {activeDay !== null
            ? `No routines scheduled for ${DAY_LABELS[activeDay]}s`
            : "No routines yet. Create one to get started!"}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((routine) => (
          <Card key={routine.id} className="transition-colors hover:bg-muted/30">
            <CardContent className="flex items-center justify-between gap-2 py-4">
              <Link href={`/routines/${routine.id}`} className="min-w-0 flex-1">
                <p className="truncate font-medium">{routine.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {routine.exerciseCount} exercises
                  {routine.days.length > 0 && (
                    <> · {routine.days.sort((a, b) => a - b).map((d) => DAY_LABELS[d]).join(", ")}</>
                  )}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                <Link
                  href={`/routines/${routine.id}/edit`}
                  className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
                  aria-label="Edit routine"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href={`/workout/start?routine=${routine.id}`}
                  className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 text-primary hover:text-primary")}
                  aria-label="Start workout"
                >
                  <Play className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
