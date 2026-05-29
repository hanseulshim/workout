import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileJson } from "lucide-react";
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Routine</h1>
        <Link href="/routines/import-json" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          <FileJson className="mr-1 h-4 w-4" />
          Import from AI
        </Link>
      </div>
      <RoutineBuilder exercises={exercises ?? []} userId={user.id} />
    </div>
  );
}
