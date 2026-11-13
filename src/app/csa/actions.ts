"use server";

import { revalidatePath } from "next/cache";
import { csaContext } from "@/lib/admin-action";
import { claimSkill, discardDraft, saveProjectAssessment, saveSkillAssessment, type SaveSkillResult, type SlotStatus } from "@/lib/supabase/draws";

function refresh(examId: string, studentId: string) {
  revalidatePath(`/csa/exams/${examId}`);
  revalidatePath(`/csa/exams/${examId}/students/${studentId}`);
  revalidatePath("/csa");
}

/** Start (or continue) scoring a skill for a student. Creates the draft that reserves the slot. */
export async function claimSkillAction(examId: string, studentId: string, examSkillId: string): Promise<{ error: string | null }> {
  const ctx = await csaContext();
  if (!ctx.ok) return { error: ctx.error };
  const { error } = await claimSkill(ctx.supabase, { examId, studentId, examSkillId, meId: ctx.meId });
  if (error) return { error };
  refresh(examId, studentId);
  return { error: null };
}

export async function saveSkillAction(
  examId: string,
  studentId: string,
  assessmentId: string,
  stepScores: Record<string, number>,
  submit: boolean,
): Promise<SaveSkillResult> {
  const ctx = await csaContext();
  if (!ctx.ok) return { error: ctx.error, status: null, rawScore: null, scaledScore: null };
  const result = await saveSkillAssessment(ctx.supabase, { assessmentId, meId: ctx.meId, stepScores, submit });
  if (!result.error) refresh(examId, studentId);
  return result;
}

/** "Wrong paper number" before submitting: drop my draft so the right skill can be recorded. */
export async function discardDraftAction(examId: string, studentId: string, assessmentId: string): Promise<{ error: string | null }> {
  const ctx = await csaContext();
  if (!ctx.ok) return { error: ctx.error };
  const { error } = await discardDraft(ctx.supabase, assessmentId, ctx.meId);
  if (error) return { error };
  refresh(examId, studentId);
  return { error: null };
}

export async function saveProjectAction(
  examId: string,
  studentId: string,
  scores: Record<string, number>,
  submit: boolean,
): Promise<{ error: string | null; status: SlotStatus | null; total: number | null }> {
  const ctx = await csaContext();
  if (!ctx.ok) return { error: ctx.error, status: null, total: null };
  const result = await saveProjectAssessment(ctx.supabase, { examId, studentId, meId: ctx.meId, scores, submit });
  if (!result.error) refresh(examId, studentId);
  return result;
}
