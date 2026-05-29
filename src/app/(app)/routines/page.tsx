import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WeeklySchedule } from "@/components/routines/weekly-schedule";
import { RoutineListWithFilter } from "@/components/routines/routine-list-with-filter";
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

  const listRoutines = routines.map((r) => ({
    id: r.id,
    name: r.name,
    days: (r.days as number[]) ?? [],
    exerciseCount: (r.routine_exercises as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));

  const today = new Date().getDay();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Routines</h1>
        <Link href="/routines/new" className={cn(buttonVariants({ size: "sm" }))}>
          <Plus className="mr-1 h-4 w-4" />
          New
        </Link>
      </div>

      <WeeklySchedule routines={listRoutines} />

      <RoutineListWithFilter routines={listRoutines} today={today} />
    </div>
  );
}
