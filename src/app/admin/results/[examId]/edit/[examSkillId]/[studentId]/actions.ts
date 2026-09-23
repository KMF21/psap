"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { adminUpdateAssessment } from "@/lib/supabase/scoring";

export interface AdminEditState {
  error: string | null;
}

export async function adminEditAssessmentAction(
  examId: string,
  examSkillId: string,
  assessmentId: string,
  nativeTotal: number,
  assignedMarks: number,
  previousRawScore: number | null,
  previousScaledScore: number | null,
  previousStatus: string | null,
  _prevState: AdminEditState,
  formData: FormData,
): Promise<AdminEditState> {
  const { userId } = await auth();
  if (!userId) return { error: "Not signed in." };

  const stepScores: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("step_")) {
      stepScores[key.replace("step_", "")] = Number(value) || 0;
    }
  }

  try {
    const supabase = await createServerSupabaseClient();

    const { data: me, error: meError } = await supabase.from("users").select("id").eq("clerk_user_id", userId).single();
    if (meError || !me) return { error: "Couldn't identify your account in the database." };

    const { error } = await adminUpdateAssessment(supabase, {
      assessmentId,
      examSkillId,
      nativeTotal,
      assignedMarks,
      stepScores,
      adminUserId: me.id,
      previousRawScore,
      previousScaledScore,
      previousStatus,
    });

    if (error) return { error };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error connecting to the database." };
  }

  redirect(`/admin/results/${examId}`);
}
