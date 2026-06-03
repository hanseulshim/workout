"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateWorkoutFinishedAt(sessionId: string, finishedAt: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("workout_sessions")
    .update({ finished_at: finishedAt })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath(`/history/${sessionId}`);
}
