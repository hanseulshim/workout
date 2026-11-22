import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RoutineBuilder } from "@/components/routines/routine-builder";
export const metadata = { title: "New Routine | Workout" };

export default async function NewRoutinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: exercises, error } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, category, equipment_type, log_type, gif_url, is_custom, user_id, created_at")
    .order("name");

  if (error) throw error;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/routines" aria-label="Back to routines" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 shrink-0")}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">New Routine</h1>
      </div>
      <RoutineBuilder exercises={exercises ?? []} userId={user.id} />
    </div>
  );
}
