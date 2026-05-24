import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Play } from "lucide-react";
export const metadata = { title: "Routines | Workout" };


export default async function RoutinesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: routines } = await supabase
    .from("routines")
    .select(`*, routine_exercises(count)`)
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Routines</h1>
        <Link href="/routines/new" className={cn(buttonVariants({ size: "sm" }))}>
          <Plus className="h-4 w-4 mr-1" />
          New
        </Link>
      </div>

      {routines?.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-12">
          No routines yet. Create one to get started!
        </p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {routines?.map((routine) => (
          <Card key={routine.id} className="hover:bg-muted/30 transition-colors">
            <CardContent className="flex items-center justify-between py-4 gap-2">
              <Link href={`/routines/${routine.id}`} className="flex-1 min-w-0">
                <p className="font-medium truncate">{routine.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(routine.routine_exercises as unknown as { count: number }[])?.[0]?.count ?? 0} exercises
                </p>
              </Link>
              <div className="flex items-center gap-1 shrink-0">
                <Link
                  href={`/routines/${routine.id}/edit`}
                  className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
                  title="Edit routine"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href={`/workout/start?routine=${routine.id}`}
                  className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 text-primary hover:text-primary")}
                  title="Start workout"
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
