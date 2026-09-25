"use server";

import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { saveProjectAssessment, type SaveProjectAssessmentResult } from "@/lib/supabase/scoring";

export async function saveProjectScoreAction(
  examId: string,
  studentId: string,
  score: number,
  maxMarks: number,
  submit: boolean,
): Promise<SaveProjectAssessmentResult> {
  const { userId } = await auth();
  if (!userId) return { error: "Not signed in.", status: null };

  try {
    const supabase = await createServerSupabaseClient();
    const { data: me, error: meError } = await supabase.from("users").select("id").eq("clerk_user_id", userId).single();
    if (meError || !me) return { error: "Couldn't identify your account in the database.", status: null };

    return await saveProjectAssessment(supabase, {
      examId,
      studentId,
      csaUserId: me.id,
      score,
      maxMarks,
      submit,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error connecting to the database.", status: null };
  }
}
