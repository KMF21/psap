"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { updateExamEligibility } from "@/lib/supabase/exams";
import { fetchAll } from "@/lib/supabase/paging";

export interface EligibilityState {
  error: string | null;
}

/** Student ids eligible for another exam — used by "copy from an earlier exam". */
export async function getEligibleIdsAction(sourceExamId: string): Promise<{ ids: string[]; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await fetchAll<{ student_id: string }>((from, to) =>
      supabase.from("exam_eligibility").select("student_id").eq("exam_id", sourceExamId).order("student_id").range(from, to),
    );
    if (error) return { ids: [], error };
    return { ids: data.map((r) => r.student_id), error: null };
  } catch (e) {
    return { ids: [], error: e instanceof Error ? e.message : "Unknown error connecting to the database." };
  }
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
