"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminContext } from "@/lib/admin-action";
import { updateExamSkill } from "@/lib/supabase/exams";

export interface EditExamSkillState {
  error: string | null;
}

export async function editExamSkillAction(
  examId: string,
  examSkillId: string,
  _prev: EditExamSkillState,
  formData: FormData,
): Promise<EditExamSkillState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };

  const assignedMarks = Number(formData.get("assignedMarks") ?? 0);
  const paperRaw = String(formData.get("paperNumber") ?? "").trim();
  const paperNumber = paperRaw === "" ? null : Number(paperRaw);
  if (!Number.isFinite(assignedMarks) || assignedMarks <= 0 || assignedMarks > 1000) return { error: "Allowed marks must be greater than 0." };
  if (paperNumber !== null && (!Number.isInteger(paperNumber) || paperNumber <= 0)) return { error: "Paper number must be a whole number above 0." };

  const { error } = await updateExamSkill(ctx.supabase, examSkillId, {
    assignedMarks: Math.round(assignedMarks * 10) / 10,
    paperNumber,
  });
  if (error) return { error };

  revalidatePath(`/admin/exams/${examId}`);
  revalidatePath(`/admin/results/${examId}`);
  redirect(`/admin/exams/${examId}`);
}
