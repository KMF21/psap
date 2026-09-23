"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSkillWithSteps } from "@/lib/supabase/skills";

export interface CreateSkillState {
  error: string | null;
}

export async function createSkillAction(_prevState: CreateSkillState, formData: FormData): Promise<CreateSkillState> {
  const name = String(formData.get("name") ?? "").trim();
  const timeAllowedMinutes = Number(formData.get("timeAllowedMinutes") ?? 10);

  const descriptions = formData.getAll("stepDescription").map((v) => String(v).trim());
  const maxMarksRaw = formData.getAll("stepMaxMarks").map((v) => Number(v));

  if (!name) {
    return { error: "Skill name is required." };
  }

  const steps = descriptions
    .map((description, i) => ({ description, maxMarks: maxMarksRaw[i] }))
    .filter((s) => s.description.length > 0);

  if (steps.length === 0) {
    return { error: "Add at least one rubric step." };
  }
  if (steps.some((s) => !Number.isFinite(s.maxMarks) || s.maxMarks <= 0)) {
    return { error: "Every step needs a positive mark value." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await createSkillWithSteps(supabase, { name, timeAllowedMinutes, steps });

    if (error) {
      return { error };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error connecting to the database." };
  }

  redirect("/admin/skills");
}
