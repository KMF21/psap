"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminContext } from "@/lib/admin-action";
import {
  deleteExam,
  removeExamSkill,
  saveProjectComponents,
  setExamCsas,
  updateExamSettings,
  updateExamStatus,
  type ExamStatus,
  type ExamType,
} from "@/lib/supabase/exams";

function refresh(examId: string) {
  revalidatePath(`/admin/exams/${examId}`);
  revalidatePath("/admin/exams");
  revalidatePath(`/admin/results/${examId}`);
}

export async function updateExamStatusAction(examId: string, status: ExamStatus): Promise<{ error: string | null }> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };
  if (!["draft", "open", "closed"].includes(status)) return { error: "Unknown status." };
  const { error } = await updateExamStatus(ctx.supabase, examId, status);
  if (error) return { error };
  refresh(examId);
  return { error: null };
}

export async function updateExamSettingsAction(
  examId: string,
  input: { title: string; drawsPerStudent: number; examType: ExamType },
): Promise<{ error: string | null }> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };
  const title = input.title.replace(/\s+/g, " ").trim();
  if (!title) return { error: "Exam title is required." };
  if (!Number.isInteger(input.drawsPerStudent) || input.drawsPerStudent < 0 || input.drawsPerStudent > 20) {
    return { error: "Skills drawn per student must be a whole number from 0 to 20." };
  }
  if (input.examType !== "practical_only" && input.examType !== "practical_and_project") return { error: "Unknown exam type." };
  const { error } = await updateExamSettings(ctx.supabase, examId, { ...input, title });
  if (error) return { error };
  refresh(examId);
  return { error: null };
}

export async function setExamCsasAction(examId: string, csaIds: string[]): Promise<{ error: string | null }> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };
  const { error } = await setExamCsas(ctx.supabase, examId, [...new Set(csaIds)]);
  if (error) return { error };
  refresh(examId);
  return { error: null };
}

export async function saveProjectComponentsAction(
  examId: string,
  components: { id: string | null; name: string; maxMarks: number }[],
): Promise<{ error: string | null }> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };
  if (components.length === 0) return { error: "A project needs at least one chapter or component." };
  if (components.length > 20) return { error: "Up to 20 components are supported." };
  const cleaned = components.map((c) => ({ id: c.id, name: c.name.replace(/\s+/g, " ").trim(), maxMarks: Math.round(Number(c.maxMarks) * 10) / 10 }));
  for (const c of cleaned) {
    if (!c.name) return { error: "Every component needs a name." };
    if (!Number.isFinite(c.maxMarks) || c.maxMarks <= 0 || c.maxMarks > 1000) return { error: `"${c.name}" needs maximum marks greater than 0.` };
  }
  const { error } = await saveProjectComponents(ctx.supabase, examId, cleaned);
  if (error) return { error };
  refresh(examId);
  return { error: null };
}

export async function removeExamSkillAction(examId: string, examSkillId: string): Promise<{ error: string | null }> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };
  const { error } = await removeExamSkill(ctx.supabase, examSkillId);
  if (error) return { error };
  refresh(examId);
  return { error: null };
}

export async function deleteExamAction(examId: string, confirmTitle: string): Promise<{ error: string | null }> {
  const ctx = await adminContext();
  if (!ctx.ok) return { error: ctx.error };
  const { error } = await deleteExam(ctx.supabase, examId, confirmTitle);
  if (error) return { error };
  revalidatePath("/admin/exams");
  revalidatePath("/admin/results");
  redirect("/admin/exams");
}
