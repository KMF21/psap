"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { updateExamEligibility } from "@/lib/supabase/exams";

export interface EligibilityState {
  error: string | null;
}

export async function saveEligibilityAction(
  examId: string,
  _prevState: EligibilityState,
  formData: FormData,
): Promise<EligibilityState> {
  const studentIds = formData.getAll("studentIds").map(String);

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await updateExamEligibility(supabase, examId, studentIds);
    if (error) return { error };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error connecting to the database." };
  }

  redirect(`/admin/exams/${examId}`);
}
