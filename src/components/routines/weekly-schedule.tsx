"use client";

import Link from "next/link";
import { Play } from "lucide-react";
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
}

export function WeeklySchedule({ routines }: Props) {
  const today = new Date().getDay(); // 0=Sun

  const byDay: Record<number, Routine[]> = {};
  for (const r of routines) {
    for (const d of r.days) {
      if (!byDay[d]) byDay[d] = [];
      byDay[d].push(r);
    }
  }

  const todayRoutines = byDay[today] ?? [];

  return (
    <div className="space-y-3">
      {/* Day strip */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_LABELS.map((label, i) => {
          const hasRoutines = (byDay[i]?.length ?? 0) > 0;
          const isToday = i === today;
          return (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium",
                isToday ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
              )}
            >
              <span>{label}</span>
              <span className={cn("h-1.5 w-1.5 rounded-full", hasRoutines ? (isToday ? "bg-primary-foreground" : "bg-primary") : "bg-transparent")} />
            </div>
          );
        })}
      </div>

      {/* Today's routines */}
      {todayRoutines.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today</p>
          {todayRoutines.map((r) => (
            <Card key={r.id} className="transition-colors hover:bg-muted/30">
              <CardContent className="flex items-center justify-between gap-2 py-3">
                <Link href={`/routines/${r.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.exerciseCount} exercises</p>
                </Link>
                <Link
                  href={`/workout/start?routine=${r.id}`}
                  className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  Start
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
