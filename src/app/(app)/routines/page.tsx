import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ChevronRight } from "lucide-react";

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
          <Card key={routine.id}>
            <Link href={`/routines/${routine.id}`}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{routine.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(routine.routine_exercises as unknown as { count: number }[])?.[0]?.count ?? 0} exercises
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
