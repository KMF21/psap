import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------- Dashboard: "my assignments" ----------------

export interface CsaAssignment {
  examSkillId: string;
  skillName: string;
  examTitle: string;
  assignedMarks: number;
  totalEligible: number;
  totalSubmitted: number;
}

type MyExamSkillRow = {
  id: string;
  assigned_marks: number;
  skills: { name: string } | null;
  exams: { id: string; title: string } | null;
};

/**
 * RLS does the filtering here — a CSA querying exam_skills only ever sees
 * rows they're actually assigned to (see csa_read_own_exam_skills in
 * 001_init.sql), so there's no need to filter by "my CSA id" client-side.
 */
export async function getMyAssignments(
  supabase: SupabaseClient,
): Promise<{ assignments: CsaAssignment[]; error: string | null }> {
  const { data: rows, error } = await supabase
    .from("exam_skills")
    .select("id, assigned_marks, skills(name), exams(id, title)");

  if (error) {
    return { assignments: [], error: error.message };
  }

  const assignments: CsaAssignment[] = [];
  for (const row of (rows ?? []) as unknown as MyExamSkillRow[]) {
    const examId = row.exams?.id;
    if (!examId) continue;

    const [{ count: totalEligible }, { count: totalSubmitted }] = await Promise.all([
      supabase.from("exam_eligibility").select("*", { count: "exact", head: true }).eq("exam_id", examId),
      supabase
        .from("skill_assessments")
        .select("*", { count: "exact", head: true })
        .eq("exam_skill_id", row.id)
        .eq("status", "submitted"),
    ]);

    assignments.push({
      examSkillId: row.id,
      skillName: row.skills?.name ?? "Unknown skill",
      examTitle: row.exams?.title ?? "Unknown exam",
      assignedMarks: row.assigned_marks,
      totalEligible: totalEligible ?? 0,
      totalSubmitted: totalSubmitted ?? 0,
    });
  }

  return { assignments, error: null };
}

// ---------------- Dashboard: "my project assignments" ----------------

export interface CsaProjectAssignment {
  examId: string;
  examTitle: string;
  maxMarks: number;
  totalEligible: number;
  totalSubmitted: number;
}

type MyProjectAssignmentRow = {
  exam_id: string;
  max_marks: number;
  exams: { title: string } | null;
};

/**
 * Same RLS-does-the-filtering pattern as getMyAssignments above — a CSA
 * querying exam_project_csa_assignments only ever sees their own rows
 * (csa_read_own_project_csa in 001_init.sql).
 */
export async function getMyProjectAssignments(
  supabase: SupabaseClient,
): Promise<{ assignments: CsaProjectAssignment[]; error: string | null }> {
  const { data: rows, error } = await supabase
    .from("exam_project_csa_assignments")
    .select("exam_id, max_marks, exams(title)");

  if (error) {
    return { assignments: [], error: error.message };
  }

  const assignments: CsaProjectAssignment[] = [];
  for (const row of (rows ?? []) as unknown as MyProjectAssignmentRow[]) {
    const [{ count: totalEligible }, { count: totalSubmitted }] = await Promise.all([
      supabase.from("exam_eligibility").select("*", { count: "exact", head: true }).eq("exam_id", row.exam_id),
      supabase
        .from("project_assessments")
        .select("*", { count: "exact", head: true })
        .eq("exam_id", row.exam_id)
        .eq("status", "submitted"),
    ]);

    assignments.push({
      examId: row.exam_id,
      examTitle: row.exams?.title ?? "Unknown exam",
      maxMarks: row.max_marks,
      totalEligible: totalEligible ?? 0,
      totalSubmitted: totalSubmitted ?? 0,
    });
  }

  return { assignments, error: null };
}

// ---------------- Project scoring page: students + existing scores ----------------

export interface ProjectScoringStudent {
  id: string;
  registrationNumber: string;
  fullName: string;
  level: string;
  status: AssessmentStatus;
  score: number | null;
}

export interface ProjectScoringData {
  examId: string;
  examTitle: string;
  maxMarks: number;
}

export async function getProjectScoringPageData(
  supabase: SupabaseClient,
  examId: string,
): Promise<{ data: ProjectScoringData | null; students: ProjectScoringStudent[]; error: string | null }> {
  const { data: assignmentRow, error: assignmentError } = await supabase
    .from("exam_project_csa_assignments")
    .select("max_marks, exams(id, title)")
    .eq("exam_id", examId)
    .maybeSingle();

  if (assignmentError) return { data: null, students: [], error: assignmentError.message };
  if (!assignmentRow) return { data: null, students: [], error: null }; // not assigned to this exam's project

  const row = assignmentRow as unknown as { max_marks: number; exams: { id: string; title: string } | null };

  const { data: studentRows, error: studentsError } = await supabase
    .from("students")
    .select("id, registration_number, full_name, level, exam_eligibility!inner(exam_id)")
    .eq("exam_eligibility.exam_id", examId)
    .order("full_name", { ascending: true });

  if (studentsError) return { data: null, students: [], error: studentsError.message };

  const { data: assessmentRows, error: assessmentsError } = await supabase
    .from("project_assessments")
    .select("student_id, score, status")
    .eq("exam_id", examId);

  if (assessmentsError) return { data: null, students: [], error: assessmentsError.message };

  const assessmentByStudent = new Map<string, { score: number | null; status: AssessmentStatus }>();
  for (const a of assessmentRows ?? []) {
    assessmentByStudent.set(a.student_id, { score: a.score, status: a.status as AssessmentStatus });
  }

  const students: ProjectScoringStudent[] = (studentRows ?? []).map((s) => {
    const assessment = assessmentByStudent.get(s.id);
    return {
      id: s.id,
      registrationNumber: s.registration_number,
      fullName: s.full_name,
      level: s.level ?? "",
      status: assessment?.status ?? "pending",
      score: assessment?.score ?? null,
    };
  });

  return {
    data: { examId, examTitle: row.exams?.title ?? "Unknown exam", maxMarks: row.max_marks },
    students,
    error: null,
  };
}

export interface SaveProjectAssessmentResult {
  error: string | null;
  status: "draft" | "submitted" | null;
}

export async function saveProjectAssessment(
  supabase: SupabaseClient,
  input: { examId: string; studentId: string; csaUserId: string; score: number; maxMarks: number; submit: boolean },
): Promise<SaveProjectAssessmentResult> {
  const { data: existing } = await supabase
    .from("project_assessments")
    .select("id, status")
    .eq("exam_id", input.examId)
    .eq("student_id", input.studentId)
    .eq("csa_id", input.csaUserId)
    .maybeSingle();

  if (existing && existing.status !== "draft") {
    return {
      error: "This project score was already submitted and is locked. An Admin must correct it directly.",
      status: existing.status as "submitted",
    };
  }

  const clampedScore = Math.max(0, Math.min(input.score, input.maxMarks));
  const newStatus = input.submit ? "submitted" : "draft";

  if (existing) {
    const { error } = await supabase
      .from("project_assessments")
      .update({ score: clampedScore, status: newStatus, submitted_at: input.submit ? new Date().toISOString() : null })
      .eq("id", existing.id);
    if (error) return { error: error.message, status: null };
  } else {
    const { error } = await supabase.from("project_assessments").insert({
      exam_id: input.examId,
      student_id: input.studentId,
      csa_id: input.csaUserId,
      score: clampedScore,
      max_marks: input.maxMarks,
      status: newStatus,
      submitted_at: input.submit ? new Date().toISOString() : null,
    });
    if (error) return { error: error.message, status: null };
  }

  return { error: null, status: newStatus };
}

// ---------------- Scoring page: full skill + students + existing scores ----------------

export interface ScoringStep {
  id: string;
  description: string;
  maxMarks: number;
}

export interface ScoringExamSkill {
  id: string;
  examId: string;
  examTitle: string;
  assignedMarks: number;
  skillName: string;
  nativeTotal: number;
  steps: ScoringStep[];
}

export type AssessmentStatus = "pending" | "draft" | "submitted";

export interface ScoringStudent {
  id: string;
  registrationNumber: string;
  fullName: string;
  level: string;
  status: AssessmentStatus; // "pending" = no assessment row exists yet (UI-only state, not stored)
  rawScore: number | null;
  scaledScore: number | null;
  stepScores: Record<string, number>; // skillStepId -> score
}

type ExamSkillDetailRow = {
  id: string;
  assigned_marks: number;
  exam_id: string;
  skills: {
    name: string;
    native_total: number;
    skill_steps: { id: string; step_order: number; description: string; max_marks: number }[];
  } | null;
  exams: { title: string } | null;
};

type StudentRow = {
  id: string;
  registration_number: string;
  full_name: string;
  level: string | null;
};

type AssessmentRow = {
  id: string;
  student_id: string;
  raw_score: number | null;
  scaled_score: number | null;
  status: "draft" | "submitted" | "amended";
  skill_assessment_step_scores: { skill_step_id: string; score: number }[];
};

export async function getScoringPageData(
  supabase: SupabaseClient,
  examSkillId: string,
): Promise<{ examSkill: ScoringExamSkill | null; students: ScoringStudent[]; error: string | null }> {
  const { data: esRow, error: esError } = await supabase
    .from("exam_skills")
    .select("id, assigned_marks, exam_id, skills(name, native_total, skill_steps(id, step_order, description, max_marks)), exams(title)")
    .eq("id", examSkillId)
    .maybeSingle();

  if (esError) return { examSkill: null, students: [], error: esError.message };
  if (!esRow) return { examSkill: null, students: [], error: null };

  const row = esRow as unknown as ExamSkillDetailRow;
  const steps: ScoringStep[] = [...(row.skills?.skill_steps ?? [])]
    .sort((a, b) => a.step_order - b.step_order)
    .map((s) => ({ id: s.id, description: s.description, maxMarks: s.max_marks }));

  const examSkill: ScoringExamSkill = {
    id: row.id,
    examId: row.exam_id,
    examTitle: row.exams?.title ?? "Unknown exam",
    assignedMarks: row.assigned_marks,
    skillName: row.skills?.name ?? "Unknown skill",
    nativeTotal: row.skills?.native_total ?? 0,
    steps,
  };

  // Students filtered to those eligible for this exam. RLS on `students`
  // additionally restricts this to students the CSA is actually eligible to
  // see (see csa_read_eligible_students in 001_init.sql) — the !inner join
  // below is what makes it "eligible for THIS exam" specifically.
  const { data: studentRows, error: studentsError } = await supabase
    .from("students")
    .select("id, registration_number, full_name, level, exam_eligibility!inner(exam_id)")
    .eq("exam_eligibility.exam_id", row.exam_id)
    .order("full_name", { ascending: true });

  if (studentsError) return { examSkill, students: [], error: studentsError.message };

  // My own existing assessments for this exam_skill — RLS auto-scopes this
  // to the signed-in CSA's own rows (csa_select_own_skill_assessments), so
  // even if another CSA is also assigned to this same skill, their scores
  // never appear here.
  const { data: assessmentRows, error: assessmentsError } = await supabase
    .from("skill_assessments")
    .select("id, student_id, raw_score, scaled_score, status, skill_assessment_step_scores(skill_step_id, score)")
    .eq("exam_skill_id", examSkillId);

  if (assessmentsError) return { examSkill, students: [], error: assessmentsError.message };

  const assessmentByStudent = new Map<string, AssessmentRow>();
  for (const a of (assessmentRows ?? []) as unknown as AssessmentRow[]) {
    assessmentByStudent.set(a.student_id, a);
  }

  const students: ScoringStudent[] = ((studentRows ?? []) as unknown as StudentRow[]).map((s) => {
    const assessment = assessmentByStudent.get(s.id);
    const stepScores: Record<string, number> = {};
    for (const ss of assessment?.skill_assessment_step_scores ?? []) {
      stepScores[ss.skill_step_id] = ss.score;
    }
    return {
      id: s.id,
      registrationNumber: s.registration_number,
      fullName: s.full_name,
      level: s.level ?? "",
      status: (assessment?.status as AssessmentStatus) ?? "pending",
      rawScore: assessment?.raw_score ?? null,
      scaledScore: assessment?.scaled_score ?? null,
      stepScores,
    };
  });

  return { examSkill, students, error: null };
}

// ---------------- Admin edit of a submitted assessment ----------------

export interface AdminEditData {
  examId: string;
  examSkillId: string;
  studentId: string;
  studentName: string;
  studentRegNumber: string;
  skillName: string;
  nativeTotal: number;
  assignedMarks: number;
  steps: ScoringStep[];
  assessmentId: string | null; // null means no assessment exists yet — nothing to edit
  currentStatus: "draft" | "submitted" | "amended" | null;
  currentRawScore: number | null;
  currentScaledScore: number | null;
  submittedByCsaName: string | null;
  stepScores: Record<string, number>;
}

export async function getAssessmentForEdit(
  supabase: SupabaseClient,
  examSkillId: string,
  studentId: string,
): Promise<{ data: AdminEditData | null; error: string | null }> {
  const { data: esRow, error: esError } = await supabase
    .from("exam_skills")
    .select("id, exam_id, assigned_marks, skills(name, native_total, skill_steps(id, step_order, description, max_marks))")
    .eq("id", examSkillId)
    .maybeSingle();

  if (esError) return { data: null, error: esError.message };
  if (!esRow) return { data: null, error: null };

  const row = esRow as unknown as ExamSkillDetailRow;
  const steps: ScoringStep[] = [...(row.skills?.skill_steps ?? [])]
    .sort((a, b) => a.step_order - b.step_order)
    .map((s) => ({ id: s.id, description: s.description, maxMarks: s.max_marks }));

  const { data: studentRow, error: studentError } = await supabase
    .from("students")
    .select("registration_number, full_name")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) return { data: null, error: studentError.message };
  if (!studentRow) return { data: null, error: null };

  // Admin can see ANY CSA's assessment here (admin_all_skill_assessments is
  // FOR ALL, unlike a CSA's own csa_id-scoped policy) — there should be at
  // most one row per (exam_skill, student) under the spec's one-CSA-per-skill
  // model, so take the first if more than one somehow exists.
  const { data: assessmentRows, error: assessmentError } = await supabase
    .from("skill_assessments")
    .select("id, status, raw_score, scaled_score, csa_id, skill_assessment_step_scores(skill_step_id, score), users(full_name)")
    .eq("exam_skill_id", examSkillId)
    .eq("student_id", studentId)
    .limit(1);

  if (assessmentError) return { data: null, error: assessmentError.message };

  const assessment = (assessmentRows ?? [])[0] as unknown as
    | {
        id: string;
        status: "draft" | "submitted" | "amended";
        raw_score: number | null;
        scaled_score: number | null;
        skill_assessment_step_scores: { skill_step_id: string; score: number }[];
        users: { full_name: string } | null;
      }
    | undefined;

  const stepScores: Record<string, number> = {};
  for (const ss of assessment?.skill_assessment_step_scores ?? []) {
    stepScores[ss.skill_step_id] = ss.score;
  }

  return {
    data: {
      examId: row.exam_id,
      examSkillId: row.id,
      studentId,
      studentName: studentRow.full_name,
      studentRegNumber: studentRow.registration_number,
      skillName: row.skills?.name ?? "Unknown skill",
      nativeTotal: row.skills?.native_total ?? 0,
      assignedMarks: row.assigned_marks,
      steps,
      assessmentId: assessment?.id ?? null,
      currentStatus: assessment?.status ?? null,
      currentRawScore: assessment?.raw_score ?? null,
      currentScaledScore: assessment?.scaled_score ?? null,
      submittedByCsaName: assessment?.users?.full_name ?? null,
      stepScores,
    },
    error: null,
  };
}

export interface AdminEditResult {
  error: string | null;
}

/**
 * Unlike a CSA's own save path, this deliberately does NOT check
 * status !== 'draft' first — Admin's RLS policy (admin_all_skill_assessments,
 * FOR ALL) is intentionally unrestricted by status, which is exactly what
 * lets an Admin correct an already-submitted, CSA-locked assessment. Every
 * change here is logged with the before/after values so the correction
 * itself is auditable even though it bypasses the normal lock.
 */
export async function adminUpdateAssessment(
  supabase: SupabaseClient,
  input: {
    assessmentId: string;
    examSkillId: string;
    nativeTotal: number;
    assignedMarks: number;
    stepScores: Record<string, number>;
    adminUserId: string;
    previousRawScore: number | null;
    previousScaledScore: number | null;
    previousStatus: string | null;
  },
): Promise<AdminEditResult> {
  const rawScore = Object.values(input.stepScores).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const scaledScore =
    input.nativeTotal > 0 ? Math.round(((rawScore / input.nativeTotal) * input.assignedMarks) * 10) / 10 : 0;

  const { error: updateError } = await supabase
    .from("skill_assessments")
    .update({ raw_score: rawScore, scaled_score: scaledScore, status: "amended" })
    .eq("id", input.assessmentId);

  if (updateError) return { error: updateError.message };

  const { error: deleteError } = await supabase
    .from("skill_assessment_step_scores")
    .delete()
    .eq("skill_assessment_id", input.assessmentId);

  if (deleteError) return { error: deleteError.message };

  const stepRows = Object.entries(input.stepScores)
    .filter(([, score]) => score > 0)
    .map(([skill_step_id, score]) => ({ skill_assessment_id: input.assessmentId, skill_step_id, score }));

  if (stepRows.length > 0) {
    const { error: stepInsertError } = await supabase.from("skill_assessment_step_scores").insert(stepRows);
    if (stepInsertError) return { error: stepInsertError.message };
  }

  await supabase.from("audit_log").insert({
    entity_type: "skill_assessment",
    entity_id: input.assessmentId,
    action: "admin_edit",
    actor_id: input.adminUserId,
    previous_value: { raw_score: input.previousRawScore, scaled_score: input.previousScaledScore, status: input.previousStatus },
    new_value: { raw_score: rawScore, scaled_score: scaledScore, status: "amended" },
  });

  return { error: null };
}
