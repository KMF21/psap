"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminContext } from "@/lib/admin-action";
import { adminReassignAssessment, adminReleaseClaim, adminUpdateAssessment } from "@/lib/supabase/scoring";

export interface AdminEditState {
  error: string | null;
}

function refresh(examId: string) {
  revalidatePath(`/admin/results/${examId}`);
  revalidatePath(`/admin/exams/${examId}/progress`);
}

export async function adminEditAssessmentAction(
  examId: string,
  assessmentId: string,
  _prevState: AdminEditState,
  formData: FormData,
): Promise<AdminEditState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };

  const stepScores: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("step_") && String(value).trim() !== "") stepScores[key.replace("step_", "")] = Number(value);
  }
  const { error } = await adminUpdateAssessment(ctx.supabase, { assessmentId, stepScores, adminUserId: ctx.adminUserId });
  if (error) return { error };
  refresh(examId);
  redirect(`/admin/results/${examId}`);
}

export async function adminReassignAction(examId: string, assessmentId: string, newExamSkillId: string, studentId: string): Promise<{ error: string | null }> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };
  if (!newExamSkillId) return { error: "Choose the correct skill." };
  const { error } = await adminReassignAssessment(ctx.supabase, assessmentId, newExamSkillId);
  if (error) return { error };
  refresh(examId);
  redirect(`/admin/results/${examId}/edit/${newExamSkillId}/${studentId}?reassigned=1`);
}

export async function adminReleaseAction(examId: string, assessmentId: string): Promise<{ error: string | null }> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };
  const { error } = await adminReleaseClaim(ctx.supabase, assessmentId);
  if (error) return { error };
  refresh(examId);
  redirect(`/admin/results/${examId}`);
}
