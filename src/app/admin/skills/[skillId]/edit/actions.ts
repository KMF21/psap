"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminContext } from "@/lib/admin-action";
import { deleteSkill, updateSkill } from "@/lib/supabase/skills";

export async function updateSkillAction(
  skillId: string,
  input: { name: string; skillNumber: number; timeAllowedMinutes: number; steps: { id: string | null; description: string; maxMarks: number }[] },
): Promise<{ error: string | null }> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };

  const name = input.name.replace(/\s+/g, " ").trim();
  if (!name) return { error: "Skill name is required." };
  if (!Number.isInteger(input.skillNumber) || input.skillNumber <= 0) return { error: "Skill number must be a whole number above 0." };
  if (!Number.isFinite(input.timeAllowedMinutes) || input.timeAllowedMinutes < 0) return { error: "Time allowed must be 0 or more minutes." };
  const steps = input.steps
    .map((s) => ({ id: s.id, description: s.description.replace(/\s+/g, " ").trim(), maxMarks: Math.round(Number(s.maxMarks) * 10) / 10 }))
    .filter((s) => s.description.length > 0);
  if (steps.length === 0) return { error: "A skill needs at least one rubric step." };
  if (steps.some((s) => !Number.isFinite(s.maxMarks) || s.maxMarks <= 0)) return { error: "Every step needs marks greater than 0." };

  const { error } = await updateSkill(ctx.supabase, skillId, { name, skillNumber: input.skillNumber, timeAllowedMinutes: Math.round(input.timeAllowedMinutes), steps });
  if (error) return { error };
  revalidatePath("/admin/skills");
  redirect("/admin/skills");
}

export async function deleteSkillAction(skillId: string): Promise<{ error: string | null }> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };
  const { error } = await deleteSkill(ctx.supabase, skillId, ctx.adminUserId);
  if (error) return { error };
  revalidatePath("/admin/skills");
  redirect("/admin/skills");
}
