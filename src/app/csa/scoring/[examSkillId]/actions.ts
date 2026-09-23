"use server";

import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { scaleScore } from "@/lib/types";

export interface SaveAssessmentResult {
  error: string | null;
  status: "draft" | "submitted" | null;
  rawScore: number | null;
  scaledScore: number | null;
}

export async function saveAssessmentAction(
  examSkillId: string,
  studentId: string,
  stepScores: Record<string, number>,
  submit: boolean,
): Promise<SaveAssessmentResult> {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Not signed in.", status: null, rawScore: null, scaledScore: null };
  }

  const supabase = await createServerSupabaseClient();

  // Resolve this CSA's internal app user id (Postgres FK target) from their
  // Clerk id — RLS inserts/updates below require the real csa_id value, it
  // isn't inferred automatically the way Supabase's own auth.uid() would.
  const { data: me, error: meError } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  if (meError || !me) {
    return { error: "Couldn't identify your account in the database.", status: null, rawScore: null, scaledScore: null };
  }

  // Pull the skill's native total + this exam's assigned marks server-side —
  // never trust a client-supplied total for the scaling calculation.
  const { data: esRow, error: esError } = await supabase
    .from("exam_skills")
    .select("assigned_marks, skills(native_total)")
    .eq("id", examSkillId)
    .single();

  if (esError || !esRow) {
    return { error: "Couldn't find this exam skill.", status: null, rawScore: null, scaledScore: null };
  }

  const nativeTotal = (esRow as unknown as { skills: { native_total: number } | null }).skills?.native_total ?? 0;
  const assignedMarks = (esRow as unknown as { assigned_marks: number }).assigned_marks;

  const rawScore = Object.values(stepScores).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const scaledScoreValue = scaleScore(rawScore, nativeTotal, assignedMarks);

  // Check for an existing assessment row — if it's already submitted, it's
  // locked (per the spec: only Admin can edit a submitted assessment).
  const { data: existing } = await supabase
    .from("skill_assessments")
    .select("id, status")
    .eq("exam_skill_id", examSkillId)
    .eq("student_id", studentId)
    .eq("csa_id", me.id)
    .maybeSingle();

  if (existing && existing.status !== "draft") {
    return {
      error: "This assessment was already submitted and is locked. An Admin must unlock it before it can change.",
      status: existing.status as "submitted",
      rawScore: null,
      scaledScore: null,
    };
  }

  const newStatus = submit ? "submitted" : "draft";
  let assessmentId: string;

  if (existing) {
    const { error: updateError } = await supabase
      .from("skill_assessments")
      .update({
        raw_score: rawScore,
        scaled_score: scaledScoreValue,
        status: newStatus,
        submitted_at: submit ? new Date().toISOString() : null,
      })
      .eq("id", existing.id);

    if (updateError) {
      return { error: updateError.message, status: null, rawScore: null, scaledScore: null };
    }
    assessmentId = existing.id;
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("skill_assessments")
      .insert({
        exam_skill_id: examSkillId,
        student_id: studentId,
        csa_id: me.id,
        raw_score: rawScore,
        scaled_score: scaledScoreValue,
        status: newStatus,
        submitted_at: submit ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return { error: insertError?.message ?? "Failed to create assessment.", status: null, rawScore: null, scaledScore: null };
    }
    assessmentId = inserted.id;
  }

  // Replace step scores wholesale — simpler and just as correct as a
  // diff-based upsert at this scale (at most 15 steps per skill).
  const { error: deleteError } = await supabase
    .from("skill_assessment_step_scores")
    .delete()
    .eq("skill_assessment_id", assessmentId);

  if (deleteError) {
    return { error: deleteError.message, status: null, rawScore: null, scaledScore: null };
  }

  const stepRows = Object.entries(stepScores)
    .filter(([, score]) => score > 0)
    .map(([skill_step_id, score]) => ({ skill_assessment_id: assessmentId, skill_step_id, score }));

  if (stepRows.length > 0) {
    const { error: stepInsertError } = await supabase.from("skill_assessment_step_scores").insert(stepRows);
    if (stepInsertError) {
      return { error: stepInsertError.message, status: null, rawScore: null, scaledScore: null };
    }
  }

  // Audit trail entry for the submission itself (admin edits are logged
  // separately, wherever that Admin-side editing UI ends up being built).
  if (submit) {
    await supabase.from("audit_log").insert({
      entity_type: "skill_assessment",
      entity_id: assessmentId,
      action: "submit",
      actor_id: me.id,
      new_value: { raw_score: rawScore, scaled_score: scaledScoreValue, status: newStatus },
    });
  }

  return { error: null, status: newStatus, rawScore, scaledScore: scaledScoreValue };
}
