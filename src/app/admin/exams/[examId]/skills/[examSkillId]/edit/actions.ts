"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { updateExamSkillAssignment } from "@/lib/supabase/exams";

export interface EditExamSkillState {
  error: string | null;
}

export async function editExamSkillAction(
  examId: string,
  examSkillId: string,
  _prevState: EditExamSkillState,
  formData: FormData,
): Promise<EditExamSkillState> {
  const assignedMarks = Number(formData.get("assignedMarks") ?? 0);
  const isCompulsory = formData.get("isCompulsory") === "on";
  const csaIds = formData.getAll("csaIds").map(String);

  if (!assignedMarks || assignedMarks <= 0) {
    return { error: "Assigned marks must be greater than 0." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await updateExamSkillAssignment(supabase, examSkillId, { assignedMarks, isCompulsory, csaIds });
    if (error) return { error };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error connecting to the database." };
  }

  redirect(`/admin/exams/${examId}`);
}
