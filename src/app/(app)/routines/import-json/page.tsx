import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { JsonRoutineImporter } from "@/components/routines/json-routine-importer";
export const metadata = { title: "Import Routine from JSON | Workout" };

export default async function ImportJsonRoutinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  async function resolveExercises(names: string[]) {
    "use server";
    const supabase2 = await createClient();
    const { data: { user: u } } = await supabase2.auth.getUser();
    if (!u) throw new Error("Not authenticated");

    const { data: exercises } = await supabase2
      .from("exercises")
      .select("id, name, log_type, gif_url")
      .or(`user_id.eq.${u.id},is_custom.eq.false`);

    const library = exercises ?? [];

    return names.map((name) => {
      const lower = name.toLowerCase().trim();
      const exact = library.find((e) => e.name.toLowerCase() === lower);
      const partial = exact ?? library.find((e) => e.name.toLowerCase().includes(lower) || lower.includes(e.name.toLowerCase()));
      const match = exact ?? partial;
      return {
        name,
        exerciseId: match?.id ?? "",
        logType: match?.log_type ?? "weight_reps",
        gifUrl: match?.gif_url ?? null,
        matched: !!match,
        sets: [] as { reps?: string; weight?: string; duration?: string }[],
      };
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Link href="/routines" aria-label="Back to routines" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 shrink-0")}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold">Import Routine from JSON</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Use AI to format your routine, then paste the JSON below to create it instantly.
        </p>
      </div>
      <JsonRoutineImporter userId={user.id} resolveExercises={resolveExercises} />
    </div>
  );
}
