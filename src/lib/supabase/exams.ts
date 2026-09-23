import type { SupabaseClient } from "@supabase/supabase-js";

export interface ExamListItem {
  id: string;
  title: string;
  courseCode: string;
  academicSession: string;
  practicalTargetTotal: number;
  projectMaxTotal: number;
  status: "draft" | "open" | "closed";
  skillCount: number;
}

export interface ExamDetailSkillRow {
  id: string;
  assignedMarks: number;
  isCompulsory: boolean;
  skillName: string;
  skillNativeTotal: number;
  assignedCsaNames: string[];
}

export interface ExamDetail {
  id: string;
  title: string;
  courseCode: string;
  academicSession: string;
  practicalTargetTotal: number;
  projectMaxTotal: number;
  status: "draft" | "open" | "closed";
  skills: ExamDetailSkillRow[];
}

// Supabase returns a to-one embedded relation (via a FK on the querying
// table, e.g. exams.course_id → courses.id) as a single object, and a
// to-many relation (e.g. exam_skills rows belonging to one exam) as an
// array — these row types mirror that shape for the two queries below.
type ExamListRow = {
  id: string;
  title: string;
  practical_target_total: number;
  project_max_total: number;
  status: "draft" | "open" | "closed";
  courses: { code: string } | null;
  academic_sessions: { label: string } | null;
};

export async function getExams(supabase: SupabaseClient): Promise<{ exams: ExamListItem[]; error: string | null }> {
  const { data: examRows, error: examsError } = await supabase
    .from("exams")
    .select("id, title, practical_target_total, project_max_total, status, courses(code), academic_sessions(label)")
    .order("created_at", { ascending: false });

  if (examsError) {
    return { exams: [], error: examsError.message };
  }

  // Counted separately rather than via PostgREST's embedded count syntax —
  // a plain grouped query is less likely to break across supabase-js
  // versions, and this table is small enough that a second round trip costs nothing.
  const { data: skillRows, error: skillsError } = await supabase.from("exam_skills").select("exam_id");
  if (skillsError) {
    return { exams: [], error: skillsError.message };
  }

  const skillCounts = new Map<string, number>();
  for (const row of skillRows ?? []) {
    skillCounts.set(row.exam_id, (skillCounts.get(row.exam_id) ?? 0) + 1);
  }

  const exams: ExamListItem[] = ((examRows ?? []) as unknown as ExamListRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    courseCode: row.courses?.code ?? "—",
    academicSession: row.academic_sessions?.label ?? "—",
    practicalTargetTotal: row.practical_target_total,
    projectMaxTotal: row.project_max_total,
    status: row.status,
    skillCount: skillCounts.get(row.id) ?? 0,
  }));

  return { exams, error: null };
}

type ExamDetailRow = {
  id: string;
  title: string;
  practical_target_total: number;
  project_max_total: number;
  status: "draft" | "open" | "closed";
  courses: { code: string } | null;
  academic_sessions: { label: string } | null;
};

type ExamSkillDetailRow = {
  id: string;
  assigned_marks: number;
  is_compulsory: boolean;
  skills: { name: string; native_total: number } | null;
  exam_skill_csa_assignments: { users: { full_name: string } | null }[];
};

export async function getExamDetail(
  supabase: SupabaseClient,
  examId: string,
): Promise<{ exam: ExamDetail | null; error: string | null }> {
  const { data: examRow, error: examError } = await supabase
    .from("exams")
    .select("id, title, practical_target_total, project_max_total, status, courses(code), academic_sessions(label)")
    .eq("id", examId)
    .maybeSingle();

  if (examError) {
    return { exam: null, error: examError.message };
  }
  if (!examRow) {
    return { exam: null, error: null }; // genuinely not found — page renders notFound()
  }

  const { data: skillRows, error: skillsError } = await supabase
    .from("exam_skills")
    .select("id, assigned_marks, is_compulsory, display_order, skills(name, native_total), exam_skill_csa_assignments(users(full_name))")
    .eq("exam_id", examId)
    .order("display_order", { ascending: true });

  if (skillsError) {
    return { exam: null, error: skillsError.message };
  }

  const row = examRow as unknown as ExamDetailRow;
  const skills: ExamDetailSkillRow[] = ((skillRows ?? []) as unknown as ExamSkillDetailRow[]).map((es) => ({
    id: es.id,
    assignedMarks: es.assigned_marks,
    isCompulsory: es.is_compulsory,
    skillName: es.skills?.name ?? "Unknown skill",
    skillNativeTotal: es.skills?.native_total ?? 0,
    assignedCsaNames: es.exam_skill_csa_assignments.map((a) => a.users?.full_name).filter((n): n is string => Boolean(n)),
  }));

  return {
    exam: {
      id: row.id,
      title: row.title,
      courseCode: row.courses?.code ?? "—",
      academicSession: row.academic_sessions?.label ?? "—",
      practicalTargetTotal: row.practical_target_total,
      projectMaxTotal: row.project_max_total,
      status: row.status,
      skills,
    },
    error: null,
  };
}
