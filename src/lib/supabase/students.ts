import type { SupabaseClient } from "@supabase/supabase-js";
import type { Student } from "@/lib/types";

// Postgres columns are snake_case (matching 001_init.sql); our app types
// are camelCase (matching mock-data.ts) so pages didn't need to change
// shape when swapping from mock data to real queries. This file is the
// only place that translates between the two.

function rowToStudent(row: {
  id: string;
  registration_number: string;
  full_name: string;
  level: string | null;
  photo_url: string | null;
}): Student {
  return {
    id: row.id,
    registrationNumber: row.registration_number,
    fullName: row.full_name,
    level: row.level ?? "",
    photoUrl: row.photo_url ?? undefined,
  };
}

export async function getStudents(supabase: SupabaseClient): Promise<{ students: Student[]; error: string | null }> {
  const { data, error } = await supabase
    .from("students")
    .select("id, registration_number, full_name, level, photo_url")
    .order("full_name", { ascending: true });

  if (error) {
    return { students: [], error: error.message };
  }
  return { students: (data ?? []).map(rowToStudent), error: null };
}

export async function getStudentById(
  supabase: SupabaseClient,
  studentId: string,
): Promise<{ student: Student | null; error: string | null }> {
  const { data, error } = await supabase
    .from("students")
    .select("id, registration_number, full_name, level, photo_url")
    .eq("id", studentId)
    .maybeSingle();

  if (error) return { student: null, error: error.message };
  if (!data) return { student: null, error: null };
  return { student: rowToStudent(data), error: null };
}

export async function updateStudent(
  supabase: SupabaseClient,
  studentId: string,
  input: { registrationNumber: string; fullName: string; level: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("students")
    .update({
      registration_number: input.registrationNumber,
      full_name: input.fullName,
      level: input.level || null,
    })
    .eq("id", studentId);

  if (error) {
    if (error.code === "23505") {
      return { error: `A student with registration number "${input.registrationNumber}" already exists.` };
    }
    return { error: error.message };
  }
  return { error: null };
}

export async function createStudent(
  supabase: SupabaseClient,
  input: { registrationNumber: string; fullName: string; level: string },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("students").insert({
    registration_number: input.registrationNumber,
    full_name: input.fullName,
    level: input.level || null,
  });

  if (error) {
    // Postgres unique_violation on registration_number
    if (error.code === "23505") {
      return { error: `A student with registration number "${input.registrationNumber}" already exists.` };
    }
    return { error: error.message };
  }
  return { error: null };
}

export interface BulkImportResult {
  inserted: number;
  skipped: number;
  error: string | null;
}

/**
 * Deliberately not a Postgres upsert with ignore-duplicates — that relies
 * on subtle PostgREST return-shape behavior that's easy to get wrong.
 * Checking existing registration numbers first, then inserting only the
 * new ones, is simple to reason about and simple to test correctly.
 */
export async function bulkImportStudents(
  supabase: SupabaseClient,
  rows: { registrationNumber: string; fullName: string; level: string }[],
): Promise<BulkImportResult> {
  if (rows.length === 0) return { inserted: 0, skipped: 0, error: null };

  const regNumbers = rows.map((r) => r.registrationNumber);
  const { data: existing, error: lookupError } = await supabase
    .from("students")
    .select("registration_number")
    .in("registration_number", regNumbers);

  if (lookupError) return { inserted: 0, skipped: 0, error: lookupError.message };

  const existingSet = new Set((existing ?? []).map((e) => e.registration_number));
  const toInsert = rows.filter((r) => !existingSet.has(r.registrationNumber));
  const skipped = rows.length - toInsert.length;

  if (toInsert.length === 0) return { inserted: 0, skipped, error: null };

  const { error: insertError } = await supabase.from("students").insert(
    toInsert.map((r) => ({
      registration_number: r.registrationNumber,
      full_name: r.fullName,
      level: r.level || null,
    })),
  );

  if (insertError) return { inserted: 0, skipped, error: insertError.message };
  return { inserted: toInsert.length, skipped, error: null };
}

// ---------------- Students list: search, filters, paging ----------------

export const STUDENTS_PAGE_SIZE = 50;

export interface StudentListItem extends Student {
  examCount: number;
}

export interface StudentListQuery {
  q?: string;
  level?: string;
  examId?: string;
  page?: number;
}

export interface StudentListResult {
  students: StudentListItem[];
  total: number;
  levels: string[];
  exams: { id: string; label: string }[];
  error: string | null;
}

/** Strip characters that have meaning inside a PostgREST or()/ilike filter. */
function cleanSearch(q: string): string {
  return q.replace(/[%,()*\\]/g, " ").replace(/\s+/g, " ").trim();
}

export async function getStudentList(supabase: SupabaseClient, query: StudentListQuery): Promise<StudentListResult> {
  const empty = { students: [], total: 0, levels: [], exams: [] };
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const from = (page - 1) * STUDENTS_PAGE_SIZE;

  let builder = supabase
    .from("students")
    .select(
      query.examId
        ? "id, registration_number, full_name, level, photo_url, exam_eligibility!inner(exam_id)"
        : "id, registration_number, full_name, level, photo_url",
      { count: "exact" },
    );

  if (query.examId) builder = builder.eq("exam_eligibility.exam_id", query.examId);
  if (query.level) builder = builder.eq("level", query.level);
  const q = cleanSearch(query.q ?? "");
  if (q) builder = builder.or(`full_name.ilike.%${q}%,registration_number.ilike.%${q}%`);

  const { data, count, error } = await builder
    .order("full_name", { ascending: true })
    .order("id", { ascending: true })
    .range(from, from + STUDENTS_PAGE_SIZE - 1);
  if (error) return { ...empty, error: error.message };

  const rows = (data ?? []) as unknown as Parameters<typeof rowToStudent>[0][];
  const ids = rows.map((r) => r.id);

  const [{ data: elig }, { data: levelRows }, { data: examRows }] = await Promise.all([
    ids.length > 0 ? supabase.from("exam_eligibility").select("student_id").in("student_id", ids) : Promise.resolve({ data: [] }),
    supabase.from("students").select("level").not("level", "is", null).limit(1000),
    supabase
      .from("exams")
      .select("id, title, academic_sessions(label)")
      .order("created_at", { ascending: false }),
  ]);

  const counts = new Map<string, number>();
  for (const e of (elig ?? []) as { student_id: string }[]) counts.set(e.student_id, (counts.get(e.student_id) ?? 0) + 1);

  const levels = [...new Set(((levelRows ?? []) as { level: string }[]).map((l) => l.level).filter(Boolean))].sort();
  const exams = ((examRows ?? []) as unknown as { id: string; title: string; academic_sessions: { label: string } | null }[]).map((e) => ({
    id: e.id,
    label: `${e.title}${e.academic_sessions ? ` (${e.academic_sessions.label})` : ""}`,
  }));

  return {
    students: rows.map((r) => ({ ...rowToStudent(r), examCount: counts.get(r.id) ?? 0 })),
    total: count ?? 0,
    levels,
    exams,
    error: null,
  };
}

// ---------------- Student history: every exam a student sat ----------------

export interface StudentHistorySkill {
  skillName: string;
  assignedMarks: number;
  score: number | null; // null = not scored / still draft
}

export interface StudentHistoryExam {
  examId: string;
  title: string;
  courseCode: string;
  session: string;
  status: "draft" | "open" | "closed";
  skills: StudentHistorySkill[];
  practicalTotal: number;
  practicalMax: number;
  projectScores: number[];
  projectMax: number;
  projectTotal: number;
  grandTotal: number;
  grandMax: number;
}

export async function getStudentHistory(
  supabase: SupabaseClient,
  studentId: string,
): Promise<{ student: Student | null; exams: StudentHistoryExam[]; error: string | null }> {
  const { student, error: studentError } = await getStudentById(supabase, studentId);
  if (studentError) return { student: null, exams: [], error: studentError };
  if (!student) return { student: null, exams: [], error: null };

  const { data: eligRows, error: eligError } = await supabase
    .from("exam_eligibility")
    .select(
      "exams(id, title, status, practical_target_total, project_max_total, created_at, courses(code), academic_sessions(label), exam_skills(id, assigned_marks, display_order, skills(name)))",
    )
    .eq("student_id", studentId);
  if (eligError) return { student, exams: [], error: eligError.message };

  type ExamRow = {
    id: string;
    title: string;
    status: "draft" | "open" | "closed";
    practical_target_total: number;
    project_max_total: number;
    created_at: string;
    courses: { code: string } | null;
    academic_sessions: { label: string } | null;
    exam_skills: { id: string; assigned_marks: number; display_order: number | null; skills: { name: string } | null }[];
  };
  const examList = ((eligRows ?? []) as unknown as { exams: ExamRow | null }[])
    .map((r) => r.exams)
    .filter((e): e is ExamRow => e !== null)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const [{ data: skillRows, error: skillError }, { data: projectRows, error: projectError }] = await Promise.all([
    supabase
      .from("skill_assessments")
      .select("exam_skill_id, scaled_score")
      .eq("student_id", studentId)
      .in("status", ["submitted", "amended"]),
    supabase
      .from("project_assessments")
      .select("exam_id, score")
      .eq("student_id", studentId)
      .in("status", ["submitted", "amended"]),
  ]);
  if (skillError || projectError) return { student, exams: [], error: (skillError ?? projectError)!.message };

  const scoreByExamSkill = new Map<string, number>();
  for (const r of (skillRows ?? []) as { exam_skill_id: string; scaled_score: number | null }[]) {
    if (r.scaled_score !== null && !scoreByExamSkill.has(r.exam_skill_id)) scoreByExamSkill.set(r.exam_skill_id, Number(r.scaled_score));
  }
  const projectByExam = new Map<string, number[]>();
  for (const r of (projectRows ?? []) as { exam_id: string; score: number | null }[]) {
    if (r.score === null) continue;
    projectByExam.set(r.exam_id, [...(projectByExam.get(r.exam_id) ?? []), Number(r.score)]);
  }

  const exams: StudentHistoryExam[] = examList.map((e) => {
    const skills = [...e.exam_skills]
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((es) => ({
        skillName: es.skills?.name ?? "Unknown skill",
        assignedMarks: Number(es.assigned_marks),
        score: scoreByExamSkill.get(es.id) ?? null,
      }));
    const practicalTotal = Math.round(skills.reduce((s, k) => s + (k.score ?? 0), 0) * 10) / 10;
    const projectScores = projectByExam.get(e.id) ?? [];
    const projectTotal = projectScores.reduce((s, v) => s + v, 0);
    return {
      examId: e.id,
      title: e.title,
      courseCode: e.courses?.code ?? "—",
      session: e.academic_sessions?.label ?? "—",
      status: e.status,
      skills,
      practicalTotal,
      practicalMax: Number(e.practical_target_total),
      projectScores,
      projectMax: Number(e.project_max_total),
      projectTotal,
      grandTotal: Math.round((practicalTotal + projectTotal) * 10) / 10,
      grandMax: Number(e.practical_target_total) + Number(e.project_max_total),
    };
  });

  return { student, exams, error: null };
}
