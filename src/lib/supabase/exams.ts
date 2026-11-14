import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAll } from "./paging";

export type ExamStatus = "draft" | "open" | "closed";
export type ExamType = "practical_only" | "practical_and_project";

export interface ExamListItem {
  id: string;
  title: string;
  courseCode: string;
  academicSession: string;
  level: string | null;
  practicalTargetTotal: number;
  projectMaxTotal: number;
  status: ExamStatus;
  skillCount: number;
}

// ---------------- Reference data ----------------

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
  skillNumber: number;
  name: string;
  nativeTotal: number;
}

export interface CsaOption {
  id: string;
  fullName: string;
  email: string | null;
}

export interface LevelOption {
  level: string;
  students: number;
}

/** Levels in use on student records, with how many students are at each. */
export async function getLevelOptions(supabase: SupabaseClient): Promise<{ levels: LevelOption[]; unset: number }> {
  const { data } = await supabase.rpc("student_level_counts");
  const rows = (data ?? []) as { level: string | null; students: number }[];
  return {
    levels: rows.filter((r) => r.level !== null).map((r) => ({ level: r.level as string, students: Number(r.students) })),
    unset: Number(rows.find((r) => r.level === null)?.students ?? 0),
  };
}

export async function changeStudentLevel(
  supabase: SupabaseClient,
  from: string | null,
  to: string,
): Promise<{ error: string | null; changed: number }> {
  const { data, error } = await supabase.rpc("admin_change_student_level", { p_from: from, p_to: to });
  return { error: error?.message ?? null, changed: Number(data ?? 0) };
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
  const { data } = await supabase.from("skills").select("id, skill_number, name, native_total").order("skill_number");
  return (data ?? []).map((r) => ({ id: r.id, skillNumber: r.skill_number, name: r.name, nativeTotal: Number(r.native_total) }));
}

export async function getCsaOptions(supabase: SupabaseClient): Promise<CsaOption[]> {
  const { data } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("role", "csa")
    .eq("is_active", true)
    .order("full_name");
  return (data ?? []).map((r) => ({ id: r.id, fullName: r.full_name, email: r.email }));
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

// ---------------- Exam create / settings / status / delete ----------------

export async function createExam(
  supabase: SupabaseClient,
  input: {
    courseId: string;
    academicSessionId: string;
    title: string;
    examType: ExamType;
    drawsPerStudent: number;
    level: string | null;
  },
): Promise<{ examId: string | null; error: string | null }> {
  // Practical and project maxima are derived in the database from the
  // skills and chapters, so they are not sent from here.
  const { data, error } = await supabase
    .from("exams")
    .insert({
      course_id: input.courseId,
      academic_session_id: input.academicSessionId,
      title: input.title,
      exam_type: input.examType,
      draws_per_student: input.drawsPerStudent,
      level: input.level,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) return { examId: null, error: error?.message ?? "Failed to create exam." };
  return { examId: data.id, error: null };
}

export async function updateExamSettings(
  supabase: SupabaseClient,
  examId: string,
  input: { title: string; drawsPerStudent: number; examType: ExamType; level: string | null },
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("exams")
    .update({ title: input.title, draws_per_student: input.drawsPerStudent, exam_type: input.examType, level: input.level })
    .eq("id", examId);
  return { error: error?.message ?? null };
}

export async function updateExamStatus(
  supabase: SupabaseClient,
  examId: string,
  status: ExamStatus,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("exams").update({ status }).eq("id", examId);
  return { error: error?.message ?? null };
}

export async function deleteExam(
  supabase: SupabaseClient,
  examId: string,
  confirmTitle: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("admin_delete_exam", { p_exam_id: examId, p_confirm_title: confirmTitle });
  return { error: error?.message ?? null };
}

// ---------------- Exam list ----------------

type ExamListRow = {
  id: string;
  title: string;
  level: string | null;
  practical_target_total: number;
  project_max_total: number;
  status: ExamStatus;
  courses: { code: string } | null;
  academic_sessions: { label: string } | null;
};

export async function getExams(supabase: SupabaseClient): Promise<{ exams: ExamListItem[]; error: string | null }> {
  const { data: examRows, error: examsError } = await supabase
    .from("exams")
    .select("id, title, level, practical_target_total, project_max_total, status, courses(code), academic_sessions(label)")
    .order("created_at", { ascending: false });

  if (examsError) return { exams: [], error: examsError.message };

  const { data: skillRows, error: skillsError } = await supabase.from("exam_skills").select("exam_id");
  if (skillsError) return { exams: [], error: skillsError.message };

  const skillCounts = new Map<string, number>();
  for (const row of skillRows ?? []) {
    skillCounts.set(row.exam_id, (skillCounts.get(row.exam_id) ?? 0) + 1);
  }

  const exams: ExamListItem[] = ((examRows ?? []) as unknown as ExamListRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    courseCode: row.courses?.code ?? "—",
    academicSession: row.academic_sessions?.label ?? "—",
    level: row.level,
    practicalTargetTotal: Number(row.practical_target_total),
    projectMaxTotal: Number(row.project_max_total),
    status: row.status,
    skillCount: skillCounts.get(row.id) ?? 0,
  }));

  return { exams, error: null };
}

// ---------------- Exam detail ----------------

export interface ExamSkillRow {
  id: string;
  skillId: string;
  skillNumber: number;
  skillName: string;
  nativeTotal: number;
  assignedMarks: number;
  isCompulsory: boolean;
  paperNumber: number | null;
  scoreCount: number; // assessments of any status recorded against this exam skill
}

export interface ProjectComponent {
  id: string;
  name: string;
  maxMarks: number;
  displayOrder: number;
}

export interface ExamDetail {
  id: string;
  title: string;
  courseCode: string;
  academicSession: string;
  level: string | null;
  examType: ExamType;
  status: ExamStatus;
  drawsPerStudent: number;
  practicalTargetTotal: number;
  projectMaxTotal: number;
  compulsory: ExamSkillRow | null;
  pool: ExamSkillRow[]; // drawn skills, by paper number
  drawnMarks: number | null; // shared marks of the draw pool (null until a drawn skill exists)
  csas: CsaOption[];
  components: ProjectComponent[];
  hasProjectScores: boolean;
  eligibleCount: number;
}

type ExamDetailRow = {
  id: string;
  title: string;
  level: string | null;
  exam_type: ExamType;
  practical_target_total: number;
  project_max_total: number;
  draws_per_student: number;
  status: ExamStatus;
  courses: { code: string } | null;
  academic_sessions: { label: string } | null;
};

type ExamSkillJoinRow = {
  id: string;
  skill_id: string;
  assigned_marks: number;
  is_compulsory: boolean;
  paper_number: number | null;
  skills: { name: string; native_total: number; skill_number: number } | null;
};

export async function getExamComponents(supabase: SupabaseClient, examId: string): Promise<ProjectComponent[]> {
  const { data } = await supabase
    .from("exam_project_components")
    .select("id, name, max_marks, display_order")
    .eq("exam_id", examId)
    .order("display_order", { ascending: true });
  return (data ?? []).map((c) => ({ id: c.id, name: c.name, maxMarks: Number(c.max_marks), displayOrder: c.display_order }));
}

export async function getExamDetail(
  supabase: SupabaseClient,
  examId: string,
): Promise<{ exam: ExamDetail | null; error: string | null }> {
  const { data: examRow, error: examError } = await supabase
    .from("exams")
    .select(
      "id, title, level, exam_type, practical_target_total, project_max_total, draws_per_student, status, courses(code), academic_sessions(label)",
    )
    .eq("id", examId)
    .maybeSingle();

  if (examError) return { exam: null, error: examError.message };
  if (!examRow) return { exam: null, error: null };

  const [skillsRes, csaRes, components, eligibleRes, projectRes] = await Promise.all([
    supabase
      .from("exam_skills")
      .select("id, skill_id, assigned_marks, is_compulsory, paper_number, skills(name, native_total, skill_number)")
      .eq("exam_id", examId),
    supabase.from("exam_csas").select("users(id, full_name, email)").eq("exam_id", examId),
    getExamComponents(supabase, examId),
    supabase.from("exam_eligibility").select("*", { count: "exact", head: true }).eq("exam_id", examId),
    supabase.from("project_assessments").select("*", { count: "exact", head: true }).eq("exam_id", examId),
  ]);

  if (skillsRes.error) return { exam: null, error: skillsRes.error.message };
  if (csaRes.error) return { exam: null, error: csaRes.error.message };

  const skillRows = (skillsRes.data ?? []) as unknown as ExamSkillJoinRow[];
  const examSkillIds = skillRows.map((r) => r.id);

  const scoreCounts = new Map<string, number>();
  if (examSkillIds.length > 0) {
    const { data: counted, error: countError } = await fetchAll<{ exam_skill_id: string }>((from, to) =>
      supabase.from("skill_assessments").select("exam_skill_id").in("exam_skill_id", examSkillIds).order("id").range(from, to),
    );
    if (countError) return { exam: null, error: countError };
    for (const r of counted) scoreCounts.set(r.exam_skill_id, (scoreCounts.get(r.exam_skill_id) ?? 0) + 1);
  }

  const skills: ExamSkillRow[] = skillRows.map((r) => ({
    id: r.id,
    skillId: r.skill_id,
    skillNumber: r.skills?.skill_number ?? 0,
    skillName: r.skills?.name ?? "Unknown skill",
    nativeTotal: Number(r.skills?.native_total ?? 0),
    assignedMarks: Number(r.assigned_marks),
    isCompulsory: r.is_compulsory,
    paperNumber: r.paper_number,
    scoreCount: scoreCounts.get(r.id) ?? 0,
  }));
  const pool = skills.filter((s) => !s.isCompulsory).sort((a, b) => (a.paperNumber ?? 0) - (b.paperNumber ?? 0));

  const row = examRow as unknown as ExamDetailRow;
  const csas = ((csaRes.data ?? []) as unknown as { users: { id: string; full_name: string; email: string | null } | null }[])
    .map((r) => r.users)
    .filter((u): u is { id: string; full_name: string; email: string | null } => u !== null)
    .map((u) => ({ id: u.id, fullName: u.full_name, email: u.email }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  return {
    exam: {
      id: row.id,
      title: row.title,
      courseCode: row.courses?.code ?? "—",
      academicSession: row.academic_sessions?.label ?? "—",
      level: row.level,
      examType: row.exam_type,
      status: row.status,
      drawsPerStudent: row.draws_per_student,
      practicalTargetTotal: Number(row.practical_target_total),
      projectMaxTotal: Number(row.project_max_total),
      compulsory: skills.find((s) => s.isCompulsory) ?? null,
      pool,
      drawnMarks: pool[0]?.assignedMarks ?? null,
      csas,
      components,
      hasProjectScores: (projectRes.count ?? 0) > 0,
      eligibleCount: eligibleRes.count ?? 0,
    },
    error: null,
  };
}

// ---------------- Exam skills ----------------

/** Translates database rule violations into plain sentences for the Admin. */
export function friendlyDbError(error: { code?: string; message: string } | null): string | null {
  if (!error) return null;
  const m = error.message;
  if (m.includes("exam_skills_exam_paper_unique")) return "Another skill in this exam already uses that paper number.";
  if (m.includes("exam_skills_one_compulsory")) return "This exam already has a compulsory skill. Remove it first, or add this one to the draw pool.";
  if (m.includes("exam_skills_exam_id_skill_id_key")) return "This skill is already part of this exam.";
  if (m.includes("exam_skills_paper_number_rule")) return "Drawn skills need a paper number.";
  if (m.includes("skills_skill_number_unique")) return "Another skill in the library already has that number.";
  return m;
}

export async function addSkillToExam(
  supabase: SupabaseClient,
  input: { examId: string; skillId: string; isCompulsory: boolean; assignedMarks: number; paperNumber: number | null },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("exam_skills").insert({
    exam_id: input.examId,
    skill_id: input.skillId,
    assigned_marks: input.assignedMarks,
    is_compulsory: input.isCompulsory,
    // null → the database fills in the skill's library number
    paper_number: input.isCompulsory ? null : input.paperNumber,
  });
  return { error: friendlyDbError(error) };
}

export interface ExamSkillForEdit extends ExamSkillRow {
  examId: string;
  examTitle: string;
  poolSize: number;
}

export async function getExamSkillForEdit(
  supabase: SupabaseClient,
  examSkillId: string,
): Promise<{ data: ExamSkillForEdit | null; error: string | null }> {
  const { data: esRow, error } = await supabase
    .from("exam_skills")
    .select("id, exam_id, skill_id, assigned_marks, is_compulsory, paper_number, skills(name, native_total, skill_number), exams(title)")
    .eq("id", examSkillId)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!esRow) return { data: null, error: null };

  const r = esRow as unknown as ExamSkillJoinRow & { exam_id: string; exams: { title: string } | null };
  const [{ count: scoreCount }, { count: poolSize }] = await Promise.all([
    supabase.from("skill_assessments").select("*", { count: "exact", head: true }).eq("exam_skill_id", examSkillId),
    supabase.from("exam_skills").select("*", { count: "exact", head: true }).eq("exam_id", r.exam_id).eq("is_compulsory", false),
  ]);

  return {
    data: {
      id: r.id,
      examId: r.exam_id,
      examTitle: r.exams?.title ?? "",
      skillId: r.skill_id,
      skillNumber: r.skills?.skill_number ?? 0,
      skillName: r.skills?.name ?? "Unknown skill",
      nativeTotal: Number(r.skills?.native_total ?? 0),
      assignedMarks: Number(r.assigned_marks),
      isCompulsory: r.is_compulsory,
      paperNumber: r.paper_number,
      scoreCount: scoreCount ?? 0,
      poolSize: poolSize ?? 0,
    },
    error: null,
  };
}

/**
 * Updates an exam skill. For a drawn skill, a change of marks is applied to
 * the WHOLE draw pool in one statement (the database requires every drawn
 * skill to carry the same marks, and recalculates any stored scores with an
 * audit entry).
 */
export async function updateExamSkill(
  supabase: SupabaseClient,
  examSkillId: string,
  input: { assignedMarks: number; paperNumber: number | null },
): Promise<{ error: string | null; poolUpdated: boolean }> {
  const { data: current, error: readError } = await supabase
    .from("exam_skills")
    .select("exam_id, is_compulsory, assigned_marks, paper_number")
    .eq("id", examSkillId)
    .maybeSingle();
  if (readError) return { error: readError.message, poolUpdated: false };
  if (!current) return { error: "That skill is no longer on this exam.", poolUpdated: false };

  let poolUpdated = false;
  if (Number(current.assigned_marks) !== input.assignedMarks) {
    const query = supabase.from("exam_skills").update({ assigned_marks: input.assignedMarks });
    const { error } = current.is_compulsory
      ? await query.eq("id", examSkillId)
      : await query.eq("exam_id", current.exam_id).eq("is_compulsory", false);
    if (error) return { error: friendlyDbError(error), poolUpdated: false };
    poolUpdated = !current.is_compulsory;
  }

  if (!current.is_compulsory && input.paperNumber !== null && input.paperNumber !== current.paper_number) {
    const { error } = await supabase.from("exam_skills").update({ paper_number: input.paperNumber }).eq("id", examSkillId);
    if (error) return { error: friendlyDbError(error), poolUpdated };
  }
  return { error: null, poolUpdated };
}

export async function removeExamSkill(supabase: SupabaseClient, examSkillId: string): Promise<{ error: string | null; removedScores: number }> {
  const { data, error } = await supabase.rpc("admin_remove_exam_skill", { p_exam_skill_id: examSkillId });
  return { error: error?.message ?? null, removedScores: Number(data ?? 0) };
}

// ---------------- Exam CSAs ----------------

export async function setExamCsas(supabase: SupabaseClient, examId: string, csaIds: string[]): Promise<{ error: string | null }> {
  const { data: existing, error: readError } = await supabase.from("exam_csas").select("csa_id").eq("exam_id", examId);
  if (readError) return { error: readError.message };
  const current = new Set((existing ?? []).map((r) => r.csa_id as string));
  const wanted = new Set(csaIds);

  const toRemove = [...current].filter((id) => !wanted.has(id));
  const toAdd = [...wanted].filter((id) => !current.has(id));

  if (toRemove.length > 0) {
    const { error } = await supabase.from("exam_csas").delete().eq("exam_id", examId).in("csa_id", toRemove);
    if (error) return { error: error.message };
  }
  if (toAdd.length > 0) {
    const { error } = await supabase.from("exam_csas").insert(toAdd.map((csa_id) => ({ exam_id: examId, csa_id })));
    if (error) return { error: error.message };
  }
  return { error: null };
}

// ---------------- Project chapters ----------------

export async function saveProjectComponents(
  supabase: SupabaseClient,
  examId: string,
  components: { id: string | null; name: string; maxMarks: number }[],
): Promise<{ error: string | null }> {
  const existing = await getExamComponents(supabase, examId);
  const keepIds = new Set(components.map((c) => c.id).filter((id): id is string => Boolean(id)));

  const toDelete = existing.filter((c) => !keepIds.has(c.id)).map((c) => c.id);
  if (toDelete.length > 0) {
    const { error } = await supabase.from("exam_project_components").delete().in("id", toDelete);
    if (error) return { error: error.message };
  }

  for (const [index, c] of components.entries()) {
    const values = { name: c.name, max_marks: c.maxMarks, display_order: index + 1 };
    if (c.id) {
      const before = existing.find((e) => e.id === c.id);
      if (before && before.name === c.name && before.maxMarks === c.maxMarks && before.displayOrder === index + 1) continue;
      const { error } = await supabase.from("exam_project_components").update(values).eq("id", c.id).eq("exam_id", examId);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("exam_project_components").insert({ ...values, exam_id: examId });
      if (error) return { error: error.message };
    }
  }
  return { error: null };
}

// ---------------- Roster (eligibility) ----------------

export interface StudentEligibilityRow {
  id: string;
  registrationNumber: string;
  fullName: string;
  level: string;
  isEligible: boolean;
  scoreCount: number; // scores this student already has in this exam
}

export async function getStudentsWithEligibility(
  supabase: SupabaseClient,
  examId: string,
): Promise<{ students: StudentEligibilityRow[]; error: string | null }> {
  const { data: allStudents, error: studentsError } = await fetchAll<{
    id: string;
    registration_number: string;
    full_name: string;
    level: string | null;
  }>((from, to) =>
    supabase
      .from("students")
      .select("id, registration_number, full_name, level")
      .order("registration_number", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
  if (studentsError) return { students: [], error: studentsError };

  const { data: eligibleRows, error: eligibilityError } = await fetchAll<{ student_id: string }>((from, to) =>
    supabase.from("exam_eligibility").select("student_id").eq("exam_id", examId).order("student_id").range(from, to),
  );
  if (eligibilityError) return { students: [], error: eligibilityError };

  const { data: examSkillRows } = await supabase.from("exam_skills").select("id").eq("exam_id", examId);
  const examSkillIds = (examSkillRows ?? []).map((r) => r.id as string);
  const scoreCounts = new Map<string, number>();
  if (examSkillIds.length > 0) {
    const { data: scored } = await fetchAll<{ student_id: string }>((from, to) =>
      supabase.from("skill_assessments").select("student_id").in("exam_skill_id", examSkillIds).order("id").range(from, to),
    );
    for (const r of scored) scoreCounts.set(r.student_id, (scoreCounts.get(r.student_id) ?? 0) + 1);
  }
  const { data: projectScored } = await fetchAll<{ student_id: string }>((from, to) =>
    supabase.from("project_assessments").select("student_id").eq("exam_id", examId).order("id").range(from, to),
  );
  for (const r of projectScored) scoreCounts.set(r.student_id, (scoreCounts.get(r.student_id) ?? 0) + 1);

  const eligibleIds = new Set(eligibleRows.map((r) => r.student_id));
  return {
    students: allStudents.map((s) => ({
      id: s.id,
      registrationNumber: s.registration_number,
      fullName: s.full_name,
      level: s.level ?? "",
      isEligible: eligibleIds.has(s.id),
      scoreCount: scoreCounts.get(s.id) ?? 0,
    })),
    error: null,
  };
}

/**
 * Brings the roster in line with the given list. Added students are simply
 * inserted. Removed students go through admin_remove_student_from_exam, which
 * also deletes any scores they have in this exam and writes an audit entry —
 * nothing is left orphaned.
 */
export async function updateExamEligibility(
  supabase: SupabaseClient,
  examId: string,
  studentIds: string[],
): Promise<{ error: string | null; added: number; removed: number }> {
  const { data: current, error: readError } = await fetchAll<{ student_id: string }>((from, to) =>
    supabase.from("exam_eligibility").select("student_id").eq("exam_id", examId).order("student_id").range(from, to),
  );
  if (readError) return { error: readError, added: 0, removed: 0 };

  const currentIds = new Set(current.map((r) => r.student_id));
  const wanted = new Set(studentIds);
  const toAdd = [...wanted].filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !wanted.has(id));

  for (let i = 0; i < toAdd.length; i += 500) {
    const chunk = toAdd.slice(i, i + 500);
    const { error } = await supabase.from("exam_eligibility").insert(chunk.map((student_id) => ({ exam_id: examId, student_id })));
    if (error) return { error: error.message, added: i, removed: 0 };
  }
  for (const [i, studentId] of toRemove.entries()) {
    const { error } = await removeStudentFromExam(supabase, examId, studentId);
    if (error) return { error, added: toAdd.length, removed: i };
  }
  return { error: null, added: toAdd.length, removed: toRemove.length };
}

export async function removeStudentFromExam(
  supabase: SupabaseClient,
  examId: string,
  studentId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("admin_remove_student_from_exam", { p_exam_id: examId, p_student_id: studentId });
  return { error: error?.message ?? null };
}
