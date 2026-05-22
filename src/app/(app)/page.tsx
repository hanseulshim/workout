import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Play, Clock, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: recentWorkouts }, { data: routines }] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", user!.id)
      .not("finished_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(3),
    supabase
      .from("routines")
      .select("*")
      .eq("user_id", user!.id)
      .order("updated_at", { ascending: false })
      .limit(3),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Good {getTimeOfDay()}</h1>
        <p className="text-muted-foreground text-sm">Ready to train?</p>
      </div>

      {/* Quick Start */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/workout/start" className={cn(buttonVariants({ size: "lg" }), "h-16 text-base")}>
          <Play className="h-5 w-5 mr-2" />
          Start Workout
        </Link>
        <Link href="/routines/new" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-16 text-base")}>
          <Plus className="h-5 w-5 mr-2" />
          New Routine
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Routines */}
        {routines && routines.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              My Routines
            </h2>
            <div className="space-y-2">
              {routines.map((routine) => (
                <Card key={routine.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
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

        {/* Recent Workouts */}
        {recentWorkouts && recentWorkouts.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Recent Workouts
            </h2>
            <div className="space-y-2">
              {recentWorkouts.map((session) => (
                <Card key={session.id}>
                  <Link href={`/history/${session.id}`}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-medium">{session.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
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
