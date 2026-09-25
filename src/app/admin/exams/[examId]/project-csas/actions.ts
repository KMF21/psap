"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { setProjectCsas } from "@/lib/supabase/exams";

export interface ProjectCsaState {
  error: string | null;
}

export async function setProjectCsasAction(
  examId: string,
  _prevState: ProjectCsaState,
  formData: FormData,
): Promise<ProjectCsaState> {
  const csaIds = formData.getAll("csaIds").map(String);
  const maxMarksPerCsa = Number(formData.get("maxMarksPerCsa") ?? 10);

  if (csaIds.length === 0) return { error: "Assign at least one CSA to score the project component." };
  if (!maxMarksPerCsa || maxMarksPerCsa <= 0) return { error: "Max marks per CSA must be greater than 0." };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await setProjectCsas(supabase, examId, csaIds, maxMarksPerCsa);
    if (error) return { error };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error connecting to the database." };
  }

  redirect(`/admin/exams/${examId}`);
}
