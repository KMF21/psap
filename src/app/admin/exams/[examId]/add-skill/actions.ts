"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminContext } from "@/lib/admin-action";
import { addSkillToExam } from "@/lib/supabase/exams";

export interface AddSkillToExamState {
  error: string | null;
}

export async function addSkillToExamAction(
  examId: string,
  _prevState: AddSkillToExamState,
  formData: FormData,
): Promise<AddSkillToExamState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };

  const skillId = String(formData.get("skillId") ?? "");
  const isCompulsory = formData.get("role") === "compulsory";
  const assignedMarks = Number(formData.get("assignedMarks") ?? 0);
  const paperRaw = String(formData.get("paperNumber") ?? "").trim();
  const paperNumber = paperRaw === "" ? null : Number(paperRaw);
  const addAnother = formData.get("addAnother") === "1";

  if (!skillId) return { error: "Select a skill." };
  if (!Number.isFinite(assignedMarks) || assignedMarks <= 0 || assignedMarks > 1000) return { error: "Allowed marks must be greater than 0." };
  if (!isCompulsory && paperNumber !== null && (!Number.isInteger(paperNumber) || paperNumber <= 0)) {
    return { error: "Paper number must be a whole number above 0." };
  }

  const { error } = await addSkillToExam(ctx.supabase, {
    examId,
    skillId,
    isCompulsory,
    assignedMarks: Math.round(assignedMarks * 10) / 10,
    paperNumber: isCompulsory ? null : paperNumber,
  });
  if (error) return { error };

  revalidatePath(`/admin/exams/${examId}`);
  redirect(addAnother ? `/admin/exams/${examId}/add-skill?role=drawn&added=1` : `/admin/exams/${examId}`);
}
