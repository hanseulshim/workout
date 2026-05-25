import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Clock, Play, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
export const metadata = { title: "Dashboard | Workout" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [
    { data: recentWorkouts, error: workoutsError },
    { data: routines, error: routinesError },
  ] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("id, name, started_at")
      .eq("user_id", user.id)
      .not("finished_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(3),
    supabase
      .from("routines")
      .select("id, name")
      .eq("user_id", user.id)
      .order("last_used_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .limit(4),
  ]);

  if (workoutsError) throw workoutsError;
  if (routinesError) throw routinesError;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Good {getTimeOfDay()}</h1>
        <p className="text-sm text-muted-foreground">Ready to train?</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/workout/start" className={cn(buttonVariants({ size: "lg" }), "h-16 text-base")}>
          <Play className="mr-2 h-5 w-5" />
          Start Workout
        </Link>
        <Link href="/routines/new" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-16 text-base")}>
          <Plus className="mr-2 h-5 w-5" />
          New Routine
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {routines && routines.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">My Routines</h2>
              <Link href="/routines" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
            </div>
            <div className="space-y-2">
              {routines.map((routine) => (
                <Card key={routine.id} className="cursor-pointer transition-colors hover:bg-muted/50">
                  <Link href={`/routines/${routine.id}`}>
                    <CardContent className="flex items-center justify-between py-4">
                      <span className="font-medium">{routine.name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        )}

        {recentWorkouts && recentWorkouts.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Workouts</h2>
            <div className="space-y-2">
              {recentWorkouts.map((session) => (
                <Card key={session.id}>
                  <Link href={`/history/${session.id}`}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-medium">{session.name}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
                        </p>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>

      {!routines?.length && !recentWorkouts?.length && (
        <Card>
          <CardHeader>
            <CardTitle>Welcome! 👋</CardTitle>
            <CardDescription>
              Create your first routine or start a blank workout to get going.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
