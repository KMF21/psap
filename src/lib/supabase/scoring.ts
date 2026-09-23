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
