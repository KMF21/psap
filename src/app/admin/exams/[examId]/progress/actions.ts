"use server";

import { revalidatePath } from "next/cache";
import { adminContext } from "@/lib/admin-action";
import { adminReleaseClaim } from "@/lib/supabase/scoring";

export async function releaseDraftAction(examId: string, assessmentId: string): Promise<{ error: string | null }> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };
  const { error } = await adminReleaseClaim(ctx.supabase, assessmentId);
  if (error) return { error };
  revalidatePath(`/admin/exams/${examId}/progress`);
  revalidatePath(`/admin/results/${examId}`);
  return { error: null };
}
