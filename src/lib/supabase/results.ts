import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAll, type Page } from "./paging";

/**
 * Results for a draw-based exam. Each student is assessed on the compulsory
 * skill plus the N skills they drew, so instead of one column per skill the
 * table shows "Compulsory" and "Draw 1..N" slots, each naming the skill that
 * student actually had. Only submitted or Admin-corrected (amended) scores
 * count towards totals; drafts appear as "in progress".
 */

export type CellStatus = "draft" | "submitted" | "amended";

export interface ResultCell {
  assessmentId: string;
  examSkillId: string;
  skillName: string;
  paperNumber: number | null;
  assignedMarks: number;
  status: CellStatus;
  scaledScore: number | null; // null while in draft
  csaName: string;
}

export interface ResultsComponent {
  id: string;
  name: string;
  maxMarks: number;
}

export interface ResultsRow {
  studentId: string;
  registrationNumber: string;
  fullName: string;
  level: string;
  compulsory: ResultCell | null;
  draws: (ResultCell | null)[]; // length N, by draw order
  extraDraws: ResultCell[]; // only if N was lowered after scoring — shown, never hidden
  practicalTotal: number;
  practicalComplete: boolean;
  componentScores: (number | null)[]; // aligned to components
  projectTotal: number;
  projectStatus: CellStatus | null;
  projectCsaName: string | null;
}

export interface ResultsData {
  examId: string;
  examTitle: string;
  academicSession: string;
  courseCode: string;
  examLevel: string | null;
  status: "draft" | "open" | "closed";
  drawsPerStudent: number;
  practicalTargetTotal: number;
  projectMaxTotal: number;
  hasProject: boolean;
  compulsory: { examSkillId: string; skillName: string; assignedMarks: number } | null;
  drawnMarks: number | null;
  components: ResultsComponent[];
  rows: ResultsRow[];
}

type ExamRow = {
  id: string;
  title: string;
  level: string | null;
  status: "draft" | "open" | "closed";
  exam_type: string;
  draws_per_student: number;
  practical_target_total: number;
  project_max_total: number;
  academic_sessions: { label: string } | null;
  courses: { code: string } | null;
};
type ExamSkillRow = { id: string; assigned_marks: number; is_compulsory: boolean; paper_number: number | null; skills: { name: string } | null };
type StudentRow = { id: string; registration_number: string; full_name: string; level: string | null };
type AssessmentRow = {
  id: string;
  exam_skill_id: string;
  student_id: string;
  scaled_score: number | null;
  status: CellStatus;
  draw_order: number | null;
  users: { full_name: string } | null;
};
type ProjectRow = {
  id: string;
  student_id: string;
  status: CellStatus;
  users: { full_name: string } | null;
  project_component_scores: { component_id: string; score: number }[];
};

const counts = (s: CellStatus) => s === "submitted" || s === "amended";
const round1 = (n: number) => Math.round(n * 10) / 10;

export async function getResultsData(
  supabase: SupabaseClient,
  examId: string,
): Promise<{ data: ResultsData | null; error: string | null }> {
  const { data: examRow, error: examError } = await supabase
    .from("exams")
    .select("id, title, level, status, exam_type, draws_per_student, practical_target_total, project_max_total, academic_sessions(label), courses(code)")
    .eq("id", examId)
    .maybeSingle();
  if (examError) return { data: null, error: examError.message };
  if (!examRow) return { data: null, error: null };
  const exam = examRow as unknown as ExamRow;

  const [{ data: esRows, error: esError }, { data: compRows, error: compError }] = await Promise.all([
    supabase.from("exam_skills").select("id, assigned_marks, is_compulsory, paper_number, skills(name)").eq("exam_id", examId),
    supabase.from("exam_project_components").select("id, name, max_marks, display_order").eq("exam_id", examId).order("display_order"),
  ]);
  if (esError) return { data: null, error: esError.message };
  if (compError) return { data: null, error: compError.message };

  const examSkills = (esRows ?? []) as unknown as ExamSkillRow[];
  const skillById = new Map(examSkills.map((s) => [s.id, s]));
  const compulsorySkill = examSkills.find((s) => s.is_compulsory) ?? null;
  const drawn = examSkills.filter((s) => !s.is_compulsory);
  const components: ResultsComponent[] = (compRows ?? []).map((c) => ({ id: c.id, name: c.name, maxMarks: Number(c.max_marks) }));

  const { data: students, error: studentsError } = await fetchAll<StudentRow>((from, to) =>
    supabase
      .from("students")
      .select("id, registration_number, full_name, level, exam_eligibility!inner(exam_id)")
      .eq("exam_eligibility.exam_id", examId)
      .order("full_name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
  if (studentsError) return { data: null, error: studentsError };

  const examSkillIds = examSkills.map((s) => s.id);
  const { data: assessments, error: aError } =
    examSkillIds.length > 0
      ? await fetchAll<AssessmentRow>((from, to) =>
          supabase
            .from("skill_assessments")
            .select("id, exam_skill_id, student_id, scaled_score, status, draw_order, users(full_name)")
            .in("exam_skill_id", examSkillIds)
            .order("id", { ascending: true })
            .range(from, to) as unknown as Page<AssessmentRow>,
        )
      : { data: [] as AssessmentRow[], error: null };
  if (aError) return { data: null, error: aError };

  const hasProject = exam.exam_type === "practical_and_project";
  const { data: projects, error: pError } = hasProject
    ? await fetchAll<ProjectRow>((from, to) =>
        supabase
          .from("project_assessments")
          .select("id, student_id, status, users(full_name), project_component_scores(component_id, score)")
          .eq("exam_id", examId)
          .order("id", { ascending: true })
          .range(from, to) as unknown as Page<ProjectRow>,
      )
    : { data: [] as ProjectRow[], error: null };
  if (pError) return { data: null, error: pError };

  const byStudent = new Map<string, AssessmentRow[]>();
  for (const a of assessments) byStudent.set(a.student_id, [...(byStudent.get(a.student_id) ?? []), a]);
  const projectByStudent = new Map(projects.map((p) => [p.student_id, p]));
  const n = exam.draws_per_student;

  const toCell = (a: AssessmentRow): ResultCell => {
    const es = skillById.get(a.exam_skill_id);
    return {
      assessmentId: a.id,
      examSkillId: a.exam_skill_id,
      skillName: es?.skills?.name ?? "Unknown skill",
      paperNumber: es?.paper_number ?? null,
      assignedMarks: Number(es?.assigned_marks ?? 0),
      status: a.status,
      scaledScore: counts(a.status) && a.scaled_score !== null ? Number(a.scaled_score) : null,
      csaName: a.users?.full_name ?? "—",
    };
  };

  const rows: ResultsRow[] = students.map((s) => {
    const mine = byStudent.get(s.id) ?? [];
    const compRow = mine.find((a) => skillById.get(a.exam_skill_id)?.is_compulsory);
    const drawRows = mine
      .filter((a) => !skillById.get(a.exam_skill_id)?.is_compulsory)
      .sort((a, b) => (a.draw_order ?? 99) - (b.draw_order ?? 99));
    const draws: (ResultCell | null)[] = Array.from({ length: n }, (_, i) => (drawRows[i] ? toCell(drawRows[i]) : null));
    const extraDraws = drawRows.slice(n).map(toCell);

    const compulsory = compRow ? toCell(compRow) : null;
    const allCells = [compulsory, ...draws, ...extraDraws].filter((c): c is ResultCell => c !== null);
    const practicalTotal = round1(allCells.reduce((sum, c) => sum + (c.scaledScore ?? 0), 0));
    const doneCount = allCells.filter((c) => c.scaledScore !== null).length;
    const practicalComplete = doneCount >= (compulsorySkill ? 1 : 0) + n;

    const project = projectByStudent.get(s.id);
    const projectCounts = project ? counts(project.status) : false;
    const scoreByComp = new Map((project?.project_component_scores ?? []).map((c) => [c.component_id, Number(c.score)]));
    const componentScores = components.map((c) => (projectCounts && scoreByComp.has(c.id) ? scoreByComp.get(c.id)! : null));
    const projectTotal = round1(componentScores.reduce((sum: number, v) => sum + (v ?? 0), 0));

    return {
      studentId: s.id,
      registrationNumber: s.registration_number,
      fullName: s.full_name,
      level: s.level ?? "",
      compulsory,
      draws,
      extraDraws,
      practicalTotal,
      practicalComplete,
      componentScores,
      projectTotal,
      projectStatus: project?.status ?? null,
      projectCsaName: project?.users?.full_name ?? null,
    };
  });

  return {
    data: {
      examId: exam.id,
      examTitle: exam.title,
      academicSession: exam.academic_sessions?.label ?? "—",
      courseCode: exam.courses?.code ?? "—",
      examLevel: exam.level,
      status: exam.status,
      drawsPerStudent: n,
      practicalTargetTotal: Number(exam.practical_target_total),
      projectMaxTotal: Number(exam.project_max_total),
      hasProject,
      compulsory: compulsorySkill
        ? { examSkillId: compulsorySkill.id, skillName: compulsorySkill.skills?.name ?? "Unknown skill", assignedMarks: Number(compulsorySkill.assigned_marks) }
        : null,
      drawnMarks: drawn[0] ? Number(drawn[0].assigned_marks) : null,
      components,
      rows,
    },
    error: null,
  };
}

/** Shared by the results page, exports and printed sheet: a cell's label. */
export function cellSkillLabel(cell: ResultCell): string {
  return cell.paperNumber !== null ? `#${cell.paperNumber} ${cell.skillName}` : cell.skillName;
}
