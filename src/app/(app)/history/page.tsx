import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ChevronRight } from "lucide-react";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";
export const metadata = { title: "History | Workout" };


export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("*, workout_sets(count)")
    .eq("user_id", user!.id)
    .not("finished_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(50);

  // Filter out any sessions with 0 sets (safety net for orphaned sessions)
  const validSessions = (sessions ?? []).filter(
    (s) => ((s.workout_sets as unknown as { count: number }[])?.[0]?.count ?? 0) > 0
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">History</h1>

      {validSessions.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-12">
          No completed workouts yet. Finish a workout to see it here!
        </p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {validSessions.map((session) => {
          const duration = session.finished_at
            ? differenceInMinutes(new Date(session.finished_at), new Date(session.started_at))
            : null;
          const setCount = (session.workout_sets as unknown as { count: number }[])?.[0]?.count ?? 0;

          return (
            <Card key={session.id}>
              <Link href={`/history/${session.id}`}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="space-y-1">
                    <p className="font-medium">{session.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {duration !== null && (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {duration}m
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {setCount} sets
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
