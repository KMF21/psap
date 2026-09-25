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
  projectCsaNames: string[];
}

// ---------------- Reference data + creation helpers ----------------

export interface CourseOption {
  id: string;
  code: string;
  title: string;
}

export interface SessionOption {
  id: string;
  label: string;
}

export interface SkillOption {
  id: string;
  name: string;
  nativeTotal: number;
}

export interface CsaOption {
  id: string;
  fullName: string;
}

export async function getCourseOptions(supabase: SupabaseClient): Promise<CourseOption[]> {
  const { data } = await supabase.from("courses").select("id, code, title").order("code");
  return (data ?? []).map((r) => ({ id: r.id, code: r.code, title: r.title }));
}

export async function getSessionOptions(supabase: SupabaseClient): Promise<SessionOption[]> {
  const { data } = await supabase.from("academic_sessions").select("id, label").order("label", { ascending: false });
  return (data ?? []).map((r) => ({ id: r.id, label: r.label }));
}

export async function getSkillOptions(supabase: SupabaseClient): Promise<SkillOption[]> {
  const { data } = await supabase.from("skills").select("id, name, native_total").order("name");
  return (data ?? []).map((r) => ({ id: r.id, name: r.name, nativeTotal: r.native_total }));
}

export async function getCsaOptions(supabase: SupabaseClient): Promise<CsaOption[]> {
  const { data } = await supabase.from("users").select("id, full_name").eq("role", "csa").eq("is_active", true).order("full_name");
  return (data ?? []).map((r) => ({ id: r.id, fullName: r.full_name }));
}

/** Finds a course by code, or creates it — used when the exam form's inline "new course" fields are filled in. */
export async function findOrCreateCourse(
  supabase: SupabaseClient,
  code: string,
  title: string,
): Promise<{ id: string | null; error: string | null }> {
  const { data: existing } = await supabase.from("courses").select("id").eq("code", code).maybeSingle();
  if (existing) return { id: existing.id, error: null };

  const { data: created, error } = await supabase.from("courses").insert({ code, title }).select("id").single();
  if (error || !created) return { id: null, error: error?.message ?? "Failed to create course." };
  return { id: created.id, error: null };
}

/** Finds an academic session by label, or creates it. */
export async function findOrCreateSession(
  supabase: SupabaseClient,
  label: string,
): Promise<{ id: string | null; error: string | null }> {
  const { data: existing } = await supabase.from("academic_sessions").select("id").eq("label", label).maybeSingle();
  if (existing) return { id: existing.id, error: null };

  const { data: created, error } = await supabase.from("academic_sessions").insert({ label }).select("id").single();
  if (error || !created) return { id: null, error: error?.message ?? "Failed to create academic session." };
  return { id: created.id, error: null };
}

export async function updateExamStatus(
  supabase: SupabaseClient,
  examId: string,
  status: "draft" | "open" | "closed",
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("exams").update({ status }).eq("id", examId);
  return { error: error?.message ?? null };
}

export async function createExam(
  supabase: SupabaseClient,
  input: {
    courseId: string;
    academicSessionId: string;
    title: string;
    examType: "practical_only" | "practical_and_project";
    practicalTargetTotal: number;
    projectMaxTotal: number;
  },
): Promise<{ examId: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("exams")
    .insert({
      course_id: input.courseId,
      academic_session_id: input.academicSessionId,
      title: input.title,
      exam_type: input.examType,
      practical_target_total: input.practicalTargetTotal,
      project_max_total: input.projectMaxTotal,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) return { examId: null, error: error?.message ?? "Failed to create exam." };
  return { examId: data.id, error: null };
}

/**
 * Replaces the project's CSA assignment list wholesale — same "delete then
 * insert" simplicity as updateExamEligibility, and safe for the same
 * reason: nothing else has a foreign key into exam_project_csa_assignments
 * rows themselves.
 */
export async function setProjectCsas(
  supabase: SupabaseClient,
  examId: string,
  csaIds: string[],
  maxMarksPerCsa: number,
): Promise<{ error: string | null }> {
  const { error: deleteError } = await supabase.from("exam_project_csa_assignments").delete().eq("exam_id", examId);
  if (deleteError) return { error: deleteError.message };

  if (csaIds.length === 0) return { error: null };

  const { error: insertError } = await supabase
    .from("exam_project_csa_assignments")
    .insert(csaIds.map((csaId) => ({ exam_id: examId, csa_id: csaId, max_marks: maxMarksPerCsa })));

  return { error: insertError?.message ?? null };
}

export async function addSkillToExam(
  supabase: SupabaseClient,
  input: { examId: string; skillId: string; assignedMarks: number; isCompulsory: boolean; csaIds: string[] },
): Promise<{ error: string | null }> {
  const { data: examSkill, error: esError } = await supabase
    .from("exam_skills")
    .insert({
      exam_id: input.examId,
      skill_id: input.skillId,
      assigned_marks: input.assignedMarks,
      is_compulsory: input.isCompulsory,
    })
    .select("id")
    .single();

  if (esError || !examSkill) {
    if (esError?.code === "23505") {
      return { error: "This skill is already assigned to this exam." };
    }
    return { error: esError?.message ?? "Failed to add skill to exam." };
  }

  if (input.csaIds.length > 0) {
    const { error: csaError } = await supabase
      .from("exam_skill_csa_assignments")
      .insert(input.csaIds.map((csaId) => ({ exam_skill_id: examSkill.id, csa_id: csaId })));

    if (csaError) return { error: csaError.message };
  }

  return { error: null };
}

// ---------------- Eligibility management ----------------

export interface StudentEligibilityRow {
  id: string;
  registrationNumber: string;
  fullName: string;
  level: string;
  isEligible: boolean;
}

export async function getStudentsWithEligibility(
  supabase: SupabaseClient,
  examId: string,
): Promise<{ students: StudentEligibilityRow[]; error: string | null }> {
  const { data: allStudents, error: studentsError } = await supabase
    .from("students")
    .select("id, registration_number, full_name, level")
    .order("full_name", { ascending: true });

  if (studentsError) return { students: [], error: studentsError.message };

  const { data: eligibleRows, error: eligibilityError } = await supabase
    .from("exam_eligibility")
    .select("student_id")
    .eq("exam_id", examId);

  if (eligibilityError) return { students: [], error: eligibilityError.message };

  const eligibleIds = new Set((eligibleRows ?? []).map((r) => r.student_id));

  const students: StudentEligibilityRow[] = (allStudents ?? []).map((s) => ({
    id: s.id,
    registrationNumber: s.registration_number,
    fullName: s.full_name,
    level: s.level ?? "",
    isEligible: eligibleIds.has(s.id),
  }));

  return { students, error: null };
}

/**
 * Replaces the exam's eligibility list wholesale with the given student ids
 * — simple and correct for a bulk "set who's eligible" action. Safe to do
 * as delete-then-insert: nothing else in the schema has a foreign key
 * pointing at exam_eligibility rows themselves, so there's no risk of
 * losing dependent data by clearing and re-adding.
 */
export async function updateExamEligibility(
  supabase: SupabaseClient,
  examId: string,
  studentIds: string[],
): Promise<{ error: string | null }> {
  const { error: deleteError } = await supabase.from("exam_eligibility").delete().eq("exam_id", examId);
  if (deleteError) return { error: deleteError.message };

  if (studentIds.length === 0) return { error: null };

  const { error: insertError } = await supabase
    .from("exam_eligibility")
    .insert(studentIds.map((studentId) => ({ exam_id: examId, student_id: studentId })));

  return { error: insertError?.message ?? null };
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

  const { data: projectCsaRows, error: projectCsaError } = await supabase
    .from("exam_project_csa_assignments")
    .select("users(full_name)")
    .eq("exam_id", examId);

  if (projectCsaError) {
    return { exam: null, error: projectCsaError.message };
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

  const projectCsaNames = ((projectCsaRows ?? []) as unknown as { users: { full_name: string } | null }[])
    .map((r) => r.users?.full_name)
    .filter((n): n is string => Boolean(n));

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
      projectCsaNames,
    },
    error: null,
  };
}
