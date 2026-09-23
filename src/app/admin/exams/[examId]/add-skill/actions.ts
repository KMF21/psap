"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { addSkillToExam } from "@/lib/supabase/exams";

export interface AddSkillToExamState {
  error: string | null;
}

export async function addSkillToExamAction(
  examId: string,
  _prevState: AddSkillToExamState,
  formData: FormData,
): Promise<AddSkillToExamState> {
  const skillId = String(formData.get("skillId") ?? "");
  const assignedMarks = Number(formData.get("assignedMarks") ?? 0);
  const isCompulsory = formData.get("isCompulsory") === "on";
  const csaIds = formData.getAll("csaIds").map(String);

  if (!skillId) return { error: "Select a skill." };
  if (!assignedMarks || assignedMarks <= 0) return { error: "Assigned marks must be greater than 0." };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await addSkillToExam(supabase, { examId, skillId, assignedMarks, isCompulsory, csaIds });
    if (error) return { error };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error connecting to the database." };
  }

  redirect(`/admin/exams/${examId}`);
}
