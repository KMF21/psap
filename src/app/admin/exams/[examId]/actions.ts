"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { updateExamStatus } from "@/lib/supabase/exams";

export async function updateExamStatusAction(
  examId: string,
  status: "draft" | "open" | "closed",
): Promise<{ error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await updateExamStatus(supabase, examId, status);
    if (error) return { error };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error connecting to the database." };
  }

  revalidatePath(`/admin/exams/${examId}`);
  revalidatePath("/admin/exams");
  return { error: null };
}
