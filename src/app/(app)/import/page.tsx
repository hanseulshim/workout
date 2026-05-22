import { HevyImportClient } from "@/components/import/hevy-import-client";
import { createClient } from "@/lib/supabase/server";

export default async function ImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, log_type")
    .or(`is_custom.eq.false,user_id.eq.${user!.id}`);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Import from Hevy</h1>
      <HevyImportClient userId={user!.id} existingExercises={exercises ?? []} />
    </div>
  );
}
