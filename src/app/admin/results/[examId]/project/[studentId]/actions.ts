"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminContext } from "@/lib/admin-action";
import { adminUpdateProjectChapters } from "@/lib/supabase/scoring";

export interface AdminProjectEditState {
  error: string | null;
}

export async function adminEditProjectAction(
  examId: string,
  studentId: string,
  _prevState: AdminProjectEditState,
  formData: FormData,
): Promise<AdminProjectEditState> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };

  const scores: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("chapter_") && String(value).trim() !== "") scores[key.replace("chapter_", "")] = Number(value);
  }
  const { error } = await adminUpdateProjectChapters(ctx.supabase, { examId, studentId, scores, adminUserId: ctx.adminUserId });
  if (error) return { error };

  revalidatePath(`/admin/results/${examId}`);
  redirect(`/admin/results/${examId}`);
}
