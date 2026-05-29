import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Play } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { WeeklySchedule } from "@/components/routines/weekly-schedule";
export const metadata = { title: "Routines | Workout" };

export default async function RoutinesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: routinesRaw, error } = await supabase
    .from("routines")
    .select("id, name, days, updated_at, last_used_at, routine_exercises(count)")
    .eq("user_id", user.id);

  if (error) throw error;

  const routines = (routinesRaw ?? []).slice().sort((left, right) => {
    const leftTime = left.last_used_at ?? left.updated_at;
    const rightTime = right.last_used_at ?? right.updated_at;
    return new Date(rightTime).getTime() - new Date(leftTime).getTime();
  });

  const scheduleRoutines = routines.map((r) => ({
    id: r.id,
    name: r.name,
    days: (r.days as number[]) ?? [],
    exerciseCount: (r.routine_exercises as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Routines</h1>
        <Link href="/routines/new" className={cn(buttonVariants({ size: "sm" }))}>
          <Plus className="mr-1 h-4 w-4" />
          New
        </Link>
      </div>

      <WeeklySchedule routines={scheduleRoutines} />

      {routines.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No routines yet. Create one to get started!
        </p>
      )}

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">All Routines</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {routines.map((routine) => (
            <Card key={routine.id} className="transition-colors hover:bg-muted/30">
              <CardContent className="flex items-center justify-between gap-2 py-4">
                <Link href={`/routines/${routine.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium">{routine.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {(routine.routine_exercises as unknown as { count: number }[])?.[0]?.count ?? 0} exercises
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
    </div>
  );
}
