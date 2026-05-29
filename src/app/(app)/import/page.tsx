import { HevyImportClient } from "@/components/import/hevy-import-client";
import { JsonRoutineImporter } from "@/components/routines/json-routine-importer";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export const metadata = { title: "Import | Workout" };


export default async function ImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, log_type, gif_url")
    .or(`is_custom.eq.false,user_id.eq.${user!.id}`);

  async function resolveExercises(names: string[]) {
    "use server";
    const supabase2 = await createClient();
    const { data: { user: u } } = await supabase2.auth.getUser();
    if (!u) throw new Error("Not authenticated");

    const { data: lib } = await supabase2
      .from("exercises")
      .select("id, name, log_type, gif_url")
      .or(`user_id.eq.${u.id},is_custom.eq.false`);

    const library = lib ?? [];
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
      <h1 className="text-2xl font-bold">Import</h1>
      <Tabs defaultValue="hevy">
        <TabsList className="w-full">
          <TabsTrigger value="hevy" className="flex-1">Hevy CSV</TabsTrigger>
          <TabsTrigger value="json" className="flex-1">Routine from AI</TabsTrigger>
        </TabsList>
        <TabsContent value="hevy" className="mt-4">
          <HevyImportClient userId={user!.id} existingExercises={exercises ?? []} />
        </TabsContent>
        <TabsContent value="json" className="mt-4">
          <JsonRoutineImporter userId={user!.id} resolveExercises={resolveExercises} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
