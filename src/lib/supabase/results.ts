import type { SupabaseClient } from "@supabase/supabase-js";

export interface ResultsSkillColumn {
  examSkillId: string;
  skillName: string;
  assignedMarks: number;
}

export interface ResultsRow {
  studentId: string;
  registrationNumber: string;
  fullName: string;
  skillScores: (number | null)[]; // aligned to skillColumns, by index
  practicalTotal: number;
  projectScores: number[]; // one per submitted project-assessing CSA
  projectTotal: number;
  grandTotal: number;
}

export interface ResultsData {
  examTitle: string;
  practicalTargetTotal: number;
  projectMaxTotal: number;
  skillColumns: ResultsSkillColumn[];
  rows: ResultsRow[];
}

type ExamRow = { title: string; practical_target_total: number; project_max_total: number };
type ExamSkillRow = { id: string; assigned_marks: number; skills: { name: string } | null };
type StudentRow = { id: string; registration_number: string; full_name: string };
type SkillAssessmentRow = { exam_skill_id: string; student_id: string; scaled_score: number | null; status: string };
type ProjectAssessmentRow = { student_id: string; score: number | null; status: string };

export async function getResultsData(
  supabase: SupabaseClient,
  examId: string,
): Promise<{ data: ResultsData | null; error: string | null }> {
  const { data: examRow, error: examError } = await supabase
    .from("exams")
    .select("title, practical_target_total, project_max_total")
    .eq("id", examId)
    .maybeSingle();

  if (examError) return { data: null, error: examError.message };
  if (!examRow) return { data: null, error: null };

  const exam = examRow as unknown as ExamRow;

  const { data: examSkillRows, error: esError } = await supabase
    .from("exam_skills")
    .select("id, assigned_marks, skills(name)")
    .eq("exam_id", examId)
    .order("display_order", { ascending: true });

  if (esError) return { data: null, error: esError.message };

  const skillColumns: ResultsSkillColumn[] = ((examSkillRows ?? []) as unknown as ExamSkillRow[]).map((row) => ({
    examSkillId: row.id,
    skillName: row.skills?.name ?? "Unknown skill",
    assignedMarks: row.assigned_marks,
  }));
  const examSkillIds = skillColumns.map((c) => c.examSkillId);

  const { data: studentRows, error: studentsError } = await supabase
    .from("students")
    .select("id, registration_number, full_name, exam_eligibility!inner(exam_id)")
    .eq("exam_eligibility.exam_id", examId)
    .order("full_name", { ascending: true });

  if (studentsError) return { data: null, error: studentsError.message };

  // Only SUBMITTED scores count toward results — a draft in progress isn't
  // official yet. Admin sees every CSA's submissions here (unlike a CSA's
  // own scoped view), via the admin_all_skill_assessments RLS policy.
  const { data: assessmentRows, error: assessmentsError } =
    examSkillIds.length > 0
      ? await supabase
          .from("skill_assessments")
          .select("exam_skill_id, student_id, scaled_score, status")
          .in("exam_skill_id", examSkillIds)
          .eq("status", "submitted")
      : { data: [] as SkillAssessmentRow[], error: null };

  if (assessmentsError) return { data: null, error: assessmentsError.message };

  // Keyed by "examSkillId::studentId". The spec's model is one CSA per
  // skill; if more than one submitted row exists for the same pair (a
  // multi-CSA-per-skill setup, which the schema technically allows but the
  // spec doesn't define scoring rules for), the first one found wins rather
  // than silently double-counting.
  const skillScoreMap = new Map<string, number>();
  for (const row of (assessmentRows ?? []) as unknown as SkillAssessmentRow[]) {
    const key = `${row.exam_skill_id}::${row.student_id}`;
    if (!skillScoreMap.has(key) && row.scaled_score !== null) {
      skillScoreMap.set(key, row.scaled_score);
    }
  }

  const { data: projectRows, error: projectError } = await supabase
    .from("project_assessments")
    .select("student_id, score, status")
    .eq("exam_id", examId)
    .eq("status", "submitted");

  if (projectError) return { data: null, error: projectError.message };

  const projectScoresByStudent = new Map<string, number[]>();
  for (const row of (projectRows ?? []) as unknown as ProjectAssessmentRow[]) {
    if (row.score === null) continue;
    const existing = projectScoresByStudent.get(row.student_id) ?? [];
    existing.push(row.score);
    projectScoresByStudent.set(row.student_id, existing);
  }

  const rows: ResultsRow[] = ((studentRows ?? []) as unknown as StudentRow[]).map((student) => {
    const skillScores = skillColumns.map((col) => skillScoreMap.get(`${col.examSkillId}::${student.id}`) ?? null);
    const practicalTotal = skillScores.reduce((sum: number, s) => sum + (s ?? 0), 0);
    const projectScores = projectScoresByStudent.get(student.id) ?? [];
    const projectTotal = projectScores.reduce((sum, s) => sum + s, 0);

    return {
      studentId: student.id,
      registrationNumber: student.registration_number,
      fullName: student.full_name,
      skillScores,
      practicalTotal,
      projectScores,
      projectTotal,
      grandTotal: practicalTotal + projectTotal,
    };
  });

  return {
    data: {
      examTitle: exam.title,
      practicalTargetTotal: exam.practical_target_total,
      projectMaxTotal: exam.project_max_total,
      skillColumns,
      rows,
    },
    error: null,
  };
}
