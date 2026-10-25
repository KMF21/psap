"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { adminUpdateProjectScores } from "@/lib/supabase/scoring";
import { isAdminSession } from "@/lib/auth";

export interface AdminProjectEditState {
  error: string | null;
}

export async function adminEditProjectAction(
  examId: string,
  studentId: string,
  _prevState: AdminProjectEditState,
  formData: FormData,
): Promise<AdminProjectEditState> {
  const { userId } = await auth();
  if (!userId) return { error: "Not signed in." };
  if (!(await isAdminSession())) return { error: "Only an Admin can correct scores." };

  const scores: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("score_")) scores[key.replace("score_", "")] = Number(value);
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: me, error: meError } = await supabase.from("users").select("id").eq("clerk_user_id", userId).single();
    if (meError || !me) return { error: "Couldn't identify your account in the database." };

    const { error } = await adminUpdateProjectScores(supabase, { examId, studentId, scores, adminUserId: me.id });
    if (error) return { error };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error connecting to the database." };
  }

  redirect(`/admin/results/${examId}`);
}
