"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useWorkoutStore } from "@/store/workout-store";

interface SessionItem {
  id: string;
  started_at: string;
  finished_at: string | null;
}

export function SessionHistoryList({ sessions }: { sessions: SessionItem[] }) {
  const { activeWorkout } = useWorkoutStore();

  return (
    <div className="space-y-2">
      {sessions.map((sess) => {
        const isInProgress = !sess.finished_at;
        const isActive = isInProgress && activeWorkout?.sessionId === sess.id;
        const href = isInProgress ? (isActive ? `/workout/${sess.id}` : null) : `/history/${sess.id}`;
        const durationText = sess.finished_at
          ? `${Math.round((new Date(sess.finished_at).getTime() - new Date(sess.started_at).getTime()) / 60000)} min`
          : isActive ? "Resume →" : "In progress";

        const inner = (
          <div className="flex items-center justify-between py-1.5 text-sm">
            <span className="font-medium">{format(new Date(sess.started_at), "EEE, MMM d yyyy")}</span>
            <span className={isActive ? "text-xs font-medium text-primary" : "text-xs text-muted-foreground"}>
              {durationText}
            </span>
          </div>
        );

        return href ? (
          <Link key={sess.id} href={href} className="block transition-opacity hover:opacity-70">
            {inner}
          </Link>
        ) : (
          <div key={sess.id}>{inner}</div>
        );
      })}
    </div>
  );
}
