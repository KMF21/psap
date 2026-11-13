"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminContext } from "@/lib/admin-action";
import { removeStudentFromExam, updateExamEligibility } from "@/lib/supabase/exams";
import { fetchAll } from "@/lib/supabase/paging";

export interface EligibilityState {
  error: string | null;
}

/** Student ids eligible for another exam — used by "copy from an earlier exam". */
export async function getEligibleIdsAction(sourceExamId: string): Promise<{ ids: string[]; error: string | null }> {
  const ctx = await adminContext();
  if (!ctx.ok) return { ids: [], error: ctx.error };
  try {
    const supabase = ctx.supabase;
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
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };
  const studentIds = [...new Set(formData.getAll("studentIds").map(String))];

  const { error } = await updateExamEligibility(ctx.supabase, examId, studentIds);
  if (error) return { error };

  revalidatePath(`/admin/exams/${examId}`);
  revalidatePath(`/admin/results/${examId}`);
  redirect(`/admin/exams/${examId}`);
}

/** Take one student off this exam's roster (and delete their scores in it), with an audit entry. */
export async function removeStudentAction(examId: string, studentId: string): Promise<{ error: string | null }> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };
  const { error } = await removeStudentFromExam(ctx.supabase, examId, studentId);
  if (error) return { error };
  revalidatePath(`/admin/exams/${examId}`);
  revalidatePath(`/admin/exams/${examId}/eligibility`);
  revalidatePath(`/admin/results/${examId}`);
  return { error: null };
}
