import type { SupabaseClient } from "@supabase/supabase-js";
import { scaleScore, validateStepScores } from "@/lib/types";
import { validateComponentScores } from "./draws";

/**
 * Admin-side corrections. CSA scoring lives in ./draws.ts.
 * Every change here is audited with before/after values.
 */

export interface ScoringStep {
  id: string;
  description: string;
  maxMarks: number;
}

// ---------------- Correct / reassign / release one skill assessment ----------------

export interface ReassignOption {
  examSkillId: string;
  label: string; // "#7 Blood pressure" or "Compulsory: Hand washing"
  taken: boolean; // student already has this skill recorded
}

export interface AdminEditData {
  examId: string;
  examTitle: string;
  examSkillId: string;
  studentId: string;
  studentName: string;
  studentRegNumber: string;
  skillName: string;
  paperNumber: number | null;
  isCompulsory: boolean;
  nativeTotal: number;
  assignedMarks: number;
  steps: ScoringStep[];
  assessmentId: string | null;
  currentStatus: "draft" | "submitted" | "amended" | null;
  currentRawScore: number | null;
  currentScaledScore: number | null;
  submittedByCsaName: string | null;
  stepScores: Record<string, number>;
  reassignOptions: ReassignOption[]; // other skills in the same exam
}

type ExamSkillDetailRow = {
  id: string;
  exam_id: string;
  assigned_marks: number;
  is_compulsory: boolean;
  paper_number: number | null;
  skills: {
    name: string;
    native_total: number;
    skill_steps: { id: string; step_order: number; description: string; max_marks: number }[];
  } | null;
  exams: { title: string } | null;
};

export async function getAssessmentForEdit(
  supabase: SupabaseClient,
  examSkillId: string,
  studentId: string,
): Promise<{ data: AdminEditData | null; error: string | null }> {
  const { data: esRow, error: esError } = await supabase
    .from("exam_skills")
    .select("id, exam_id, assigned_marks, is_compulsory, paper_number, skills(name, native_total, skill_steps(id, step_order, description, max_marks)), exams(title)")
    .eq("id", examSkillId)
    .maybeSingle();
  if (esError) return { data: null, error: esError.message };
  if (!esRow) return { data: null, error: null };
  const row = esRow as unknown as ExamSkillDetailRow;

  const [{ data: studentRow, error: studentError }, { data: assessmentRow, error: assessmentError }, { data: siblings }] =
    await Promise.all([
      supabase.from("students").select("registration_number, full_name").eq("id", studentId).maybeSingle(),
      supabase
        .from("skill_assessments")
        .select("id, status, raw_score, scaled_score, skill_assessment_step_scores(skill_step_id, score), users(full_name)")
        .eq("exam_skill_id", examSkillId)
        .eq("student_id", studentId)
        .maybeSingle(),
      supabase.from("exam_skills").select("id, is_compulsory, paper_number, skills(name)").eq("exam_id", row.exam_id),
    ]);
  if (studentError) return { data: null, error: studentError.message };
  if (assessmentError) return { data: null, error: assessmentError.message };
  if (!studentRow) return { data: null, error: null };

  const siblingRows = (siblings ?? []) as unknown as { id: string; is_compulsory: boolean; paper_number: number | null; skills: { name: string } | null }[];
  const { data: takenRows } = await supabase
    .from("skill_assessments")
    .select("exam_skill_id")
    .eq("student_id", studentId)
    .in("exam_skill_id", siblingRows.map((s) => s.id));
  const taken = new Set((takenRows ?? []).map((t) => t.exam_skill_id as string));

  const reassignOptions: ReassignOption[] = siblingRows
    .filter((s) => s.id !== examSkillId)
    .sort((a, b) => Number(b.is_compulsory) - Number(a.is_compulsory) || (a.paper_number ?? 0) - (b.paper_number ?? 0))
    .map((s) => ({
      examSkillId: s.id,
      label: s.is_compulsory ? `Compulsory: ${s.skills?.name ?? "Unknown skill"}` : `#${s.paper_number} ${s.skills?.name ?? "Unknown skill"}`,
      taken: taken.has(s.id),
    }));

  const a = assessmentRow as unknown as {
    id: string;
    status: "draft" | "submitted" | "amended";
    raw_score: number | null;
    scaled_score: number | null;
    skill_assessment_step_scores: { skill_step_id: string; score: number }[];
    users: { full_name: string } | null;
  } | null;
  const stepScores: Record<string, number> = {};
  for (const ss of a?.skill_assessment_step_scores ?? []) stepScores[ss.skill_step_id] = Number(ss.score);

  return {
    data: {
      examId: row.exam_id,
      examTitle: row.exams?.title ?? "",
      examSkillId: row.id,
      studentId,
      studentName: studentRow.full_name,
      studentRegNumber: studentRow.registration_number,
      skillName: row.skills?.name ?? "Unknown skill",
      paperNumber: row.paper_number,
      isCompulsory: row.is_compulsory,
      nativeTotal: Number(row.skills?.native_total ?? 0),
      assignedMarks: Number(row.assigned_marks),
      steps: [...(row.skills?.skill_steps ?? [])]
        .sort((x, y) => x.step_order - y.step_order)
        .map((s) => ({ id: s.id, description: s.description, maxMarks: Number(s.max_marks) })),
      assessmentId: a?.id ?? null,
      currentStatus: a?.status ?? null,
      currentRawScore: a?.raw_score === null || a?.raw_score === undefined ? null : Number(a.raw_score),
      currentScaledScore: a?.scaled_score === null || a?.scaled_score === undefined ? null : Number(a.scaled_score),
      submittedByCsaName: a?.users?.full_name ?? null,
      stepScores,
      reassignOptions,
    },
    error: null,
  };
}

/**
 * Admin correction of a skill assessment. Deliberately not limited by
 * status — that is what lets an Admin fix a submitted, CSA-locked score.
 * The result is marked "amended" and logged with before/after values.
 */
export async function adminUpdateAssessment(
  supabase: SupabaseClient,
  input: { assessmentId: string; stepScores: Record<string, number>; adminUserId: string },
): Promise<{ error: string | null }> {
  const { data: current, error: currentError } = await supabase
    .from("skill_assessments")
    .select("raw_score, scaled_score, status, exam_skills(assigned_marks, skills(native_total, skill_steps(id, max_marks)))")
    .eq("id", input.assessmentId)
    .maybeSingle();
  if (currentError) return { error: currentError.message };
  if (!current) return { error: "That assessment no longer exists." };

  const cur = current as unknown as {
    raw_score: number | null;
    scaled_score: number | null;
    status: string;
    exam_skills: { assigned_marks: number; skills: { native_total: number; skill_steps: { id: string; max_marks: number }[] } | null } | null;
  };
  const steps = cur.exam_skills?.skills?.skill_steps ?? [];
  const checked = validateStepScores(input.stepScores, steps);
  if (checked.error) return { error: checked.error };
  const missing = steps.filter((s) => !(s.id in checked.clean)).length;
  if (missing > 0) return { error: `Enter a score for every step (${missing} left). Use 0 where a step was not done.` };

  const rawScore = Math.round(Object.values(checked.clean).reduce((sum, v) => sum + v, 0) * 10) / 10;
  const scaledScore = scaleScore(rawScore, Number(cur.exam_skills?.skills?.native_total ?? 0), Number(cur.exam_skills?.assigned_marks ?? 0));

  const { error: deleteError } = await supabase.from("skill_assessment_step_scores").delete().eq("skill_assessment_id", input.assessmentId);
  if (deleteError) return { error: deleteError.message };
  const stepRows = Object.entries(checked.clean).map(([skill_step_id, score]) => ({ skill_assessment_id: input.assessmentId, skill_step_id, score }));
  if (stepRows.length > 0) {
    const { error } = await supabase.from("skill_assessment_step_scores").insert(stepRows);
    if (error) return { error: error.message };
  }

  const { error: updateError } = await supabase
    .from("skill_assessments")
    .update({ raw_score: rawScore, scaled_score: scaledScore, status: "amended", updated_at: new Date().toISOString() })
    .eq("id", input.assessmentId);
  if (updateError) return { error: updateError.message };

  await supabase.from("audit_log").insert({
    entity_type: "skill_assessment",
    entity_id: input.assessmentId,
    action: "admin_edit",
    actor_id: input.adminUserId,
    previous_value: { raw_score: cur.raw_score, scaled_score: cur.scaled_score, status: cur.status },
    new_value: { raw_score: rawScore, scaled_score: scaledScore, status: "amended" },
  });
  return { error: null };
}

export async function adminReassignAssessment(
  supabase: SupabaseClient,
  assessmentId: string,
  newExamSkillId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("admin_reassign_skill_assessment", {
    p_assessment_id: assessmentId,
    p_new_exam_skill_id: newExamSkillId,
  });
  return { error: error?.message ?? null };
}

export async function adminReleaseClaim(supabase: SupabaseClient, assessmentId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("admin_release_claim", { p_assessment_id: assessmentId });
  return { error: error?.message ?? null };
}

// ---------------- Project: per-chapter correction ----------------

export interface AdminProjectEditData {
  examId: string;
  examTitle: string;
  studentName: string;
  studentRegNumber: string;
  components: { id: string; name: string; maxMarks: number }[];
  assessmentId: string | null;
  status: "draft" | "submitted" | "amended" | null;
  csaName: string | null;
  scores: Record<string, number>;
}

export async function getProjectForAdminEdit(
  supabase: SupabaseClient,
  examId: string,
  studentId: string,
): Promise<{ data: AdminProjectEditData | null; error: string | null }> {
  const [{ data: exam }, { data: student }, { data: comps, error: compError }, { data: project, error: projectError }] = await Promise.all([
    supabase.from("exams").select("title, exam_type").eq("id", examId).maybeSingle(),
    supabase.from("students").select("full_name, registration_number").eq("id", studentId).maybeSingle(),
    supabase.from("exam_project_components").select("id, name, max_marks, display_order").eq("exam_id", examId).order("display_order"),
    supabase
      .from("project_assessments")
      .select("id, status, users(full_name), project_component_scores(component_id, score)")
      .eq("exam_id", examId)
      .eq("student_id", studentId)
      .maybeSingle(),
  ]);
  if (compError) return { data: null, error: compError.message };
  if (projectError) return { data: null, error: projectError.message };
  if (!exam || !student || exam.exam_type !== "practical_and_project") return { data: null, error: null };

  const p = project as unknown as {
    id: string;
    status: "draft" | "submitted" | "amended";
    users: { full_name: string } | null;
    project_component_scores: { component_id: string; score: number }[];
  } | null;
  const scores: Record<string, number> = {};
  for (const s of p?.project_component_scores ?? []) scores[s.component_id] = Number(s.score);

  return {
    data: {
      examId,
      examTitle: exam.title,
      studentName: student.full_name,
      studentRegNumber: student.registration_number,
      components: (comps ?? []).map((c) => ({ id: c.id, name: c.name, maxMarks: Number(c.max_marks) })),
      assessmentId: p?.id ?? null,
      status: p?.status ?? null,
      csaName: p?.users?.full_name ?? null,
      scores,
    },
    error: null,
  };
}

/**
 * Admin sets chapter scores. If no CSA has scored the project yet, the Admin
 * may enter it directly (recorded under the Admin's name). Either way the
 * result is "amended" and audited chapter by chapter.
 */
export async function adminUpdateProjectChapters(
  supabase: SupabaseClient,
  input: { examId: string; studentId: string; scores: Record<string, number>; adminUserId: string },
): Promise<{ error: string | null }> {
  const { data: comps } = await supabase.from("exam_project_components").select("id, name, max_marks").eq("exam_id", input.examId);
  const checked = validateComponentScores(input.scores, comps ?? [], true);
  if (checked.error) return { error: checked.error };

  const { data: existing, error: readError } = await supabase
    .from("project_assessments")
    .select("id, status, score, project_component_scores(component_id, score)")
    .eq("exam_id", input.examId)
    .eq("student_id", input.studentId)
    .maybeSingle();
  if (readError) return { error: readError.message };

  let assessmentId: string;
  const previous: Record<string, number> = {};
  let previousStatus: string | null = null;
  if (existing) {
    const e = existing as unknown as { id: string; status: string; project_component_scores: { component_id: string; score: number }[] };
    assessmentId = e.id;
    previousStatus = e.status;
    for (const s of e.project_component_scores) previous[s.component_id] = Number(s.score);
  } else {
    const { data: created, error } = await supabase
      .from("project_assessments")
      .insert({ exam_id: input.examId, student_id: input.studentId, csa_id: input.adminUserId, status: "amended", score: 0 })
      .select("id")
      .single();
    if (error || !created) return { error: error?.message ?? "Could not create the project record." };
    assessmentId = created.id;
  }

  const { error: deleteError } = await supabase.from("project_component_scores").delete().eq("project_assessment_id", assessmentId);
  if (deleteError) return { error: deleteError.message };
  const rows = Object.entries(checked.clean).map(([component_id, score]) => ({ project_assessment_id: assessmentId, component_id, score }));
  const { error: insertError } = await supabase.from("project_component_scores").insert(rows);
  if (insertError) return { error: insertError.message };

  const { error: updateError } = await supabase
    .from("project_assessments")
    .update({ status: "amended", updated_at: new Date().toISOString() })
    .eq("id", assessmentId);
  if (updateError) return { error: updateError.message };

  const nameById = new Map((comps ?? []).map((c) => [c.id as string, c.name as string]));
  const named = (m: Record<string, number>) => Object.fromEntries(Object.entries(m).map(([id, v]) => [nameById.get(id) ?? id, v]));
  const total = Math.round(Object.values(checked.clean).reduce((s, v) => s + v, 0) * 10) / 10;
  await supabase.from("audit_log").insert({
    entity_type: "project_assessment",
    entity_id: assessmentId,
    action: "admin_edit",
    actor_id: input.adminUserId,
    previous_value: existing ? { chapters: named(previous), status: previousStatus } : null,
    new_value: { chapters: named(checked.clean), total, status: "amended" },
  });
  return { error: null };
}
