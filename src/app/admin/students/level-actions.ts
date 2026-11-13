"use server";

import { revalidatePath } from "next/cache";
import { adminContext } from "@/lib/admin-action";
import { changeStudentLevel } from "@/lib/supabase/exams";

/** Move every student at one level to another (e.g. Year 2 → Year 3), audited. */
export async function changeLevelAction(from: string | null, to: string): Promise<{ error: string | null; changed: number }> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error, changed: 0 };
  const target = to.replace(/\s+/g, " ").trim();
  if (!target) return { error: "Enter the new level.", changed: 0 };
  const result = await changeStudentLevel(ctx.supabase, from, target);
  if (!result.error) revalidatePath("/admin/students");
  return result;
}
