import type { SupabaseClient } from "@supabase/supabase-js";
import { scaleScore, validateStepScores } from "@/lib/types";
import { fetchAll } from "./paging";

/**
 * CSA side of a draw-based exam.
 *
 * - A CSA sees every exam they are on (exam_csas) and can score any skill
 *   for any student on that exam's roster.
 * - Opening a skill for a student CLAIMS it: a draft assessment row is
 *   created, and the database's unique (exam_skill, student) rule stops any
 *   other CSA scoring the same student + skill.
 * - Who holds which slot (without scores) comes from the
 *   exam_assessment_progress / exam_project_progress functions; a CSA's own
 *   scores come from their own rows (RLS).
 */

export type SlotStatus = "draft" | "submitted" | "amended";

export async function getMyUserId(supabase: SupabaseClient, clerkUserId: string): Promise<string | null> {
  const { data } = await supabase.from("users").select("id").eq("clerk_user_id", clerkUserId).maybeSingle();
  return data?.id ?? null;
}

/** Postgres raises our own rule messages as plain text; surface them as-is. */
function dbMessage(error: { message: string } | null, fallback: string): string {
  return error?.message?.trim() || fallback;
}

// ---------------- Dashboard ----------------

export interface CsaExamCard {
  examId: string;
  title: string;
  courseCode: string;
  level: string | null;
  status: "draft" | "open" | "closed";
  drawsPerStudent: number;
  hasProject: boolean;
  eligible: number;
  practicalComplete: number; // students with compulsory + N draws all submitted
  projectComplete: number;
}

type MyExamRow = {
  exams: {
    id: string;
    title: string;
    level: string | null;
    status: "draft" | "open" | "closed";
    exam_type: string;
    draws_per_student: number;
    courses: { code: string } | null;
  } | null;
};

export async function getMyExams(supabase: SupabaseClient, meId: string): Promise<{ exams: CsaExamCard[]; error: string | null }> {
  const { data, error } = await supabase
    .from("exam_csas")
    .select("exams(id, title, level, status, exam_type, draws_per_student, courses(code))")
    .eq("csa_id", meId);
  if (error) return { exams: [], error: error.message };

  const cards: CsaExamCard[] = [];
  for (const row of (data ?? []) as unknown as MyExamRow[]) {
    const e = row.exams;
    if (!e) continue;
    const progress = await getExamProgress(supabase, e.id);
    if (progress.error) return { exams: [], error: progress.error };
    cards.push({
      examId: e.id,
      title: e.title,
      courseCode: e.courses?.code ?? "—",
      level: e.level,
      status: e.status,
      drawsPerStudent: e.draws_per_student,
      hasProject: e.exam_type === "practical_and_project",
      eligible: progress.eligible,
      practicalComplete: progress.practicalComplete,
      projectComplete: progress.projectComplete,
    });
  }
  const order = { open: 0, draft: 1, closed: 2 } as const;
  cards.sort((a, b) => order[a.status] - order[b.status] || a.title.localeCompare(b.title));
  return { exams: cards, error: null };
}

type ProgressRow = {
  assessment_id: string;
  student_id: string;
  exam_skill_id: string;
  is_compulsory: boolean;
  paper_number: number | null;
  draw_order: number | null;
  status: SlotStatus;
  csa_id: string;
  csa_name: string;
};
type ProjectProgressRow = { assessment_id: string; student_id: string; status: SlotStatus; csa_id: string; csa_name: string };

async function loadProgress(supabase: SupabaseClient, examId: string) {
  const [skills, projects] = await Promise.all([
    fetchAll<ProgressRow>((from, to) =>
      supabase.rpc("exam_assessment_progress", { p_exam_id: examId }).order("student_id").order("exam_skill_id").range(from, to),
    ),
    fetchAll<ProjectProgressRow>((from, to) =>
      supabase.rpc("exam_project_progress", { p_exam_id: examId }).order("student_id").range(from, to),
    ),
  ]);
  return { skills, projects };
}

const isDone = (s: SlotStatus) => s === "submitted" || s === "amended";

async function getExamProgress(supabase: SupabaseClient, examId: string) {
  const [{ data: exam }, { count: eligible }, { skills, projects }] = await Promise.all([
    supabase.from("exams").select("draws_per_student").eq("id", examId).maybeSingle(),
    supabase.from("exam_eligibility").select("*", { count: "exact", head: true }).eq("exam_id", examId),
    loadProgress(supabase, examId),
  ]);
  if (skills.error || projects.error) {
    return { eligible: 0, practicalComplete: 0, projectComplete: 0, error: skills.error ?? projects.error };
  }
  const n = exam?.draws_per_student ?? 0;
  const perStudent = new Map<string, { comp: boolean; draws: number }>();
  for (const r of skills.data) {
    if (!isDone(r.status)) continue;
    const s = perStudent.get(r.student_id) ?? { comp: false, draws: 0 };
    if (r.is_compulsory) s.comp = true;
    else s.draws += 1;
    perStudent.set(r.student_id, s);
  }
  const practicalComplete = [...perStudent.values()].filter((s) => s.comp && s.draws >= n).length;
  const projectComplete = projects.data.filter((p) => isDone(p.status)).length;
  return { eligible: eligible ?? 0, practicalComplete, projectComplete, error: null };
}

// ---------------- Exam board (students + progress) ----------------

export interface BoardSkill {
  examSkillId: string;
  skillName: string;
  paperNumber: number | null;
  assignedMarks: number;
  isCompulsory: boolean;
}

export interface BoardSlot {
  assessmentId: string;
  examSkillId: string;
  skillName: string;
  paperNumber: number | null;
  drawOrder: number | null;
  status: SlotStatus;
  csaName: string;
  mine: boolean;
}

export interface BoardStudent {
  id: string;
  registrationNumber: string;
  fullName: string;
  level: string;
  compulsory: BoardSlot | null;
  draws: BoardSlot[];
  project: { assessmentId: string; status: SlotStatus; csaName: string; mine: boolean } | null;
  practicalDone: number; // submitted slots (compulsory + draws)
  practicalNeeded: number; // 1 + N (or N if the exam has no compulsory skill yet)
  complete: boolean; // practical fully assessed (and project, if the exam has one)
}

export interface ExamBoard {
  examId: string;
  title: string;
  status: "draft" | "open" | "closed";
  drawsPerStudent: number;
  hasProject: boolean;
  compulsory: BoardSkill | null;
  pool: BoardSkill[];
  students: BoardStudent[];
}

type BoardExamRow = {
  id: string;
  title: string;
  status: "draft" | "open" | "closed";
  exam_type: string;
  draws_per_student: number;
  exam_skills: {
    id: string;
    assigned_marks: number;
    is_compulsory: boolean;
    paper_number: number | null;
    skills: { name: string } | null;
  }[];
};

/** meId = the signed-in CSA (must be on the exam); null = Admin view. */
export async function getExamBoard(
  supabase: SupabaseClient,
  examId: string,
  meId: string | null,
): Promise<{ board: ExamBoard | null; error: string | null }> {
  if (meId) {
    const { data: onExam } = await supabase.from("exam_csas").select("id").eq("exam_id", examId).eq("csa_id", meId).maybeSingle();
    if (!onExam) return { board: null, error: null };
  }

  const { data: examRow, error: examError } = await supabase
    .from("exams")
    .select("id, title, status, exam_type, draws_per_student, exam_skills(id, assigned_marks, is_compulsory, paper_number, skills(name))")
    .eq("id", examId)
    .maybeSingle();
  if (examError) return { board: null, error: examError.message };
  if (!examRow) return { board: null, error: null };
  const exam = examRow as unknown as BoardExamRow;

  const skills: BoardSkill[] = exam.exam_skills.map((es) => ({
    examSkillId: es.id,
    skillName: es.skills?.name ?? "Unknown skill",
    paperNumber: es.paper_number,
    assignedMarks: Number(es.assigned_marks),
    isCompulsory: es.is_compulsory,
  }));
  const skillById = new Map(skills.map((s) => [s.examSkillId, s]));
  const compulsory = skills.find((s) => s.isCompulsory) ?? null;
  const pool = skills.filter((s) => !s.isCompulsory).sort((a, b) => (a.paperNumber ?? 0) - (b.paperNumber ?? 0));

  const [{ data: studentRows, error: studentsError }, { skills: progress, projects }] = await Promise.all([
    fetchAll<{ id: string; registration_number: string; full_name: string; level: string | null }>((from, to) =>
      supabase
        .from("students")
        .select("id, registration_number, full_name, level, exam_eligibility!inner(exam_id)")
        .eq("exam_eligibility.exam_id", examId)
        .order("registration_number", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    ),
    loadProgress(supabase, examId),
  ]);
  if (studentsError) return { board: null, error: studentsError };
  if (progress.error || projects.error) return { board: null, error: progress.error ?? projects.error };

  const slotsByStudent = new Map<string, ProgressRow[]>();
  for (const r of progress.data) slotsByStudent.set(r.student_id, [...(slotsByStudent.get(r.student_id) ?? []), r]);
  const projectByStudent = new Map(projects.data.map((p) => [p.student_id, p]));
  const hasProject = exam.exam_type === "practical_and_project";
  const n = exam.draws_per_student;

  const toSlot = (r: ProgressRow): BoardSlot => ({
    assessmentId: r.assessment_id,
    examSkillId: r.exam_skill_id,
    skillName: skillById.get(r.exam_skill_id)?.skillName ?? "Unknown skill",
    paperNumber: r.paper_number,
    drawOrder: r.draw_order,
    status: r.status,
    csaName: r.csa_name,
    mine: r.csa_id === meId,
  });

  const students: BoardStudent[] = studentRows.map((s) => {
    const rows = slotsByStudent.get(s.id) ?? [];
    const comp = rows.find((r) => r.is_compulsory);
    const draws = rows
      .filter((r) => !r.is_compulsory)
      .sort((a, b) => (a.draw_order ?? 0) - (b.draw_order ?? 0))
      .map(toSlot);
    const project = projectByStudent.get(s.id);
    const practicalNeeded = (compulsory ? 1 : 0) + n;
    const practicalDone = (comp && isDone(comp.status) ? 1 : 0) + draws.filter((d) => isDone(d.status)).length;
    const projectDone = !hasProject || (project ? isDone(project.status) : false);
    return {
      id: s.id,
      registrationNumber: s.registration_number,
      fullName: s.full_name,
      level: s.level ?? "",
      compulsory: comp ? toSlot(comp) : null,
      draws,
      project: project ? { assessmentId: project.assessment_id, status: project.status, csaName: project.csa_name, mine: project.csa_id === meId } : null,
      practicalDone,
      practicalNeeded,
      complete: practicalDone >= practicalNeeded && projectDone,
    };
  });

  return {
    board: {
      examId: exam.id,
      title: exam.title,
      status: exam.status,
      drawsPerStudent: n,
      hasProject,
      compulsory,
      pool,
      students,
    },
    error: null,
  };
}

// ---------------- Claim a skill for a student ----------------

export async function claimSkill(
  supabase: SupabaseClient,
  input: { examId: string; studentId: string; examSkillId: string; meId: string },
): Promise<{ error: string | null; assessmentId: string | null }> {
  // Make sure the skill belongs to this exam (never trust the browser).
  const { data: es } = await supabase
    .from("exam_skills")
    .select("id, exams(status)")
    .eq("id", input.examSkillId)
    .eq("exam_id", input.examId)
    .maybeSingle();
  if (!es) return { error: "That skill is not part of this examination.", assessmentId: null };
  const status = (es as unknown as { exams: { status: string } | null }).exams?.status;
  if (status === "closed") return { error: "This examination is closed. Ask the Admin to make changes.", assessmentId: null };
  if (status === "draft") return { error: "This examination has not been opened yet.", assessmentId: null };

  // Already mine? Just continue it.
  const { data: mine } = await supabase
    .from("skill_assessments")
    .select("id")
    .eq("exam_skill_id", input.examSkillId)
    .eq("student_id", input.studentId)
    .eq("csa_id", input.meId)
    .maybeSingle();
  if (mine) return { error: null, assessmentId: mine.id };

  const { data, error } = await supabase
    .from("skill_assessments")
    .insert({ exam_skill_id: input.examSkillId, student_id: input.studentId, csa_id: input.meId, status: "draft" })
    .select("id")
    .single();
  if (error || !data) return { error: dbMessage(error, "Could not start this assessment."), assessmentId: null };
  return { error: null, assessmentId: data.id };
}

// ---------------- Scoring one skill for one student ----------------

export interface ScoringStep {
  id: string;
  description: string;
  maxMarks: number;
}

export interface SkillScoringData {
  examId: string;
  examTitle: string;
  examStatus: "draft" | "open" | "closed";
  examSkillId: string;
  skillName: string;
  paperNumber: number | null;
  isCompulsory: boolean;
  assignedMarks: number;
  nativeTotal: number;
  steps: ScoringStep[];
  student: { id: string; registrationNumber: string; fullName: string; level: string };
  assessment: { id: string; status: SlotStatus; stepScores: Record<string, number>; drawOrder: number | null } | null;
  heldBy: string | null; // another CSA's name, if they hold this slot
}

type SkillDetailRow = {
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
  exams: { title: string; status: "draft" | "open" | "closed" } | null;
};

export async function getSkillScoringData(
  supabase: SupabaseClient,
  input: { examId: string; studentId: string; examSkillId: string; meId: string },
): Promise<{ data: SkillScoringData | null; error: string | null }> {
  const [{ data: esRow, error: esError }, { data: student }] = await Promise.all([
    supabase
      .from("exam_skills")
      .select("id, exam_id, assigned_marks, is_compulsory, paper_number, skills(name, native_total, skill_steps(id, step_order, description, max_marks)), exams(title, status)")
      .eq("id", input.examSkillId)
      .eq("exam_id", input.examId)
      .maybeSingle(),
    supabase.from("students").select("id, registration_number, full_name, level").eq("id", input.studentId).maybeSingle(),
  ]);
  if (esError) return { data: null, error: esError.message };
  if (!esRow || !student) return { data: null, error: null };
  const es = esRow as unknown as SkillDetailRow;

  const { data: mine } = await supabase
    .from("skill_assessments")
    .select("id, status, draw_order, skill_assessment_step_scores(skill_step_id, score)")
    .eq("exam_skill_id", input.examSkillId)
    .eq("student_id", input.studentId)
    .eq("csa_id", input.meId)
    .maybeSingle();

  let heldBy: string | null = null;
  if (!mine) {
    const { data: progress } = await supabase.rpc("exam_assessment_progress", { p_exam_id: input.examId });
    const holder = ((progress ?? []) as ProgressRow[]).find(
      (r) => r.exam_skill_id === input.examSkillId && r.student_id === input.studentId,
    );
    heldBy = holder?.csa_name ?? null;
  }

  const m = mine as unknown as {
    id: string;
    status: SlotStatus;
    draw_order: number | null;
    skill_assessment_step_scores: { skill_step_id: string; score: number }[];
  } | null;
  const stepScores: Record<string, number> = {};
  for (const ss of m?.skill_assessment_step_scores ?? []) stepScores[ss.skill_step_id] = Number(ss.score);

  return {
    data: {
      examId: es.exam_id,
      examTitle: es.exams?.title ?? "",
      examStatus: es.exams?.status ?? "open",
      examSkillId: es.id,
      skillName: es.skills?.name ?? "Unknown skill",
      paperNumber: es.paper_number,
      isCompulsory: es.is_compulsory,
      assignedMarks: Number(es.assigned_marks),
      nativeTotal: Number(es.skills?.native_total ?? 0),
      steps: [...(es.skills?.skill_steps ?? [])]
        .sort((a, b) => a.step_order - b.step_order)
        .map((s) => ({ id: s.id, description: s.description, maxMarks: Number(s.max_marks) })),
      student: {
        id: student.id,
        registrationNumber: student.registration_number,
        fullName: student.full_name,
        level: student.level ?? "",
      },
      assessment: m ? { id: m.id, status: m.status, stepScores, drawOrder: m.draw_order } : null,
      heldBy,
    },
    error: null,
  };
}

export interface SaveSkillResult {
  error: string | null;
  status: SlotStatus | null;
  rawScore: number | null;
  scaledScore: number | null;
}

export async function saveSkillAssessment(
  supabase: SupabaseClient,
  input: { assessmentId: string; meId: string; stepScores: Record<string, number>; submit: boolean },
): Promise<SaveSkillResult> {
  const fail = (error: string): SaveSkillResult => ({ error, status: null, rawScore: null, scaledScore: null });

  const { data: row, error: readError } = await supabase
    .from("skill_assessments")
    .select("id, status, csa_id, exam_skills(assigned_marks, exams(status), skills(native_total, skill_steps(id, max_marks)))")
    .eq("id", input.assessmentId)
    .eq("csa_id", input.meId)
    .maybeSingle();
  if (readError) return fail(readError.message);
  if (!row) return fail("This assessment is no longer yours to edit. It may have been released or reassigned by the Admin.");

  const a = row as unknown as {
    id: string;
    status: SlotStatus;
    exam_skills: {
      assigned_marks: number;
      exams: { status: string } | null;
      skills: { native_total: number; skill_steps: { id: string; max_marks: number }[] } | null;
    } | null;
  };
  if (a.status !== "draft") return fail("This assessment was already submitted and is locked. Ask the Admin to correct it.");
  if (a.exam_skills?.exams?.status === "closed") return fail("This examination is closed. Ask the Admin to make changes.");

  const steps = a.exam_skills?.skills?.skill_steps ?? [];
  const checked = validateStepScores(input.stepScores, steps);
  if (checked.error) return fail(checked.error);
  if (input.submit) {
    const missing = steps.filter((s) => !(s.id in checked.clean));
    if (missing.length > 0) {
      return fail(`Enter a score for every step before submitting (${missing.length} step${missing.length > 1 ? "s" : ""} left). Use 0 where a step was not done.`);
    }
  }

  const nativeTotal = Number(a.exam_skills?.skills?.native_total ?? 0);
  const assignedMarks = Number(a.exam_skills?.assigned_marks ?? 0);
  const rawScore = Math.round(Object.values(checked.clean).reduce((sum, v) => sum + v, 0) * 10) / 10;
  const scaledScore = scaleScore(rawScore, nativeTotal, assignedMarks);
  const newStatus: SlotStatus = input.submit ? "submitted" : "draft";

  // Step scores first, so a submitted row never points at missing steps.
  const { error: deleteError } = await supabase.from("skill_assessment_step_scores").delete().eq("skill_assessment_id", a.id);
  if (deleteError) return fail(deleteError.message);
  const stepRows = Object.entries(checked.clean).map(([skill_step_id, score]) => ({ skill_assessment_id: a.id, skill_step_id, score }));
  if (stepRows.length > 0) {
    const { error } = await supabase.from("skill_assessment_step_scores").insert(stepRows);
    if (error) return fail(error.message);
  }

  const { error: updateError } = await supabase
    .from("skill_assessments")
    .update({
      raw_score: rawScore,
      scaled_score: scaledScore,
      status: newStatus,
      submitted_at: input.submit ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", a.id)
    .eq("status", "draft");
  if (updateError) return fail(updateError.message);

  if (input.submit) {
    await supabase.from("audit_log").insert({
      entity_type: "skill_assessment",
      entity_id: a.id,
      action: "submit",
      actor_id: input.meId,
      new_value: { raw_score: rawScore, scaled_score: scaledScore, status: newStatus },
    });
  }
  return { error: null, status: newStatus, rawScore, scaledScore };
}

/** A CSA frees a slot they opened by mistake (e.g. wrong paper number) — drafts only. */
export async function discardDraft(supabase: SupabaseClient, assessmentId: string, meId: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from("skill_assessments")
    .delete()
    .eq("id", assessmentId)
    .eq("csa_id", meId)
    .eq("status", "draft")
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "Only your own unsubmitted draft can be discarded." };
  return { error: null };
}

// ---------------- Project (chapters) ----------------

export interface ProjectScoringData {
  examId: string;
  examTitle: string;
  examStatus: "draft" | "open" | "closed";
  student: { id: string; registrationNumber: string; fullName: string; level: string };
  components: { id: string; name: string; maxMarks: number }[];
  assessment: { id: string; status: SlotStatus; scores: Record<string, number> } | null;
  heldBy: string | null;
}

export async function getProjectScoringData(
  supabase: SupabaseClient,
  input: { examId: string; studentId: string; meId: string },
): Promise<{ data: ProjectScoringData | null; error: string | null }> {
  const [{ data: exam }, { data: student }, { data: comps, error: compError }] = await Promise.all([
    supabase.from("exams").select("id, title, status, exam_type").eq("id", input.examId).maybeSingle(),
    supabase.from("students").select("id, registration_number, full_name, level").eq("id", input.studentId).maybeSingle(),
    supabase.from("exam_project_components").select("id, name, max_marks, display_order").eq("exam_id", input.examId).order("display_order"),
  ]);
  if (compError) return { data: null, error: compError.message };
  if (!exam || !student || exam.exam_type !== "practical_and_project") return { data: null, error: null };

  const { data: mine } = await supabase
    .from("project_assessments")
    .select("id, status, project_component_scores(component_id, score)")
    .eq("exam_id", input.examId)
    .eq("student_id", input.studentId)
    .eq("csa_id", input.meId)
    .maybeSingle();

  let heldBy: string | null = null;
  if (!mine) {
    const { data: progress } = await supabase.rpc("exam_project_progress", { p_exam_id: input.examId });
    heldBy = ((progress ?? []) as ProjectProgressRow[]).find((p) => p.student_id === input.studentId)?.csa_name ?? null;
  }

  const m = mine as unknown as { id: string; status: SlotStatus; project_component_scores: { component_id: string; score: number }[] } | null;
  const scores: Record<string, number> = {};
  for (const s of m?.project_component_scores ?? []) scores[s.component_id] = Number(s.score);

  return {
    data: {
      examId: exam.id,
      examTitle: exam.title,
      examStatus: exam.status,
      student: { id: student.id, registrationNumber: student.registration_number, fullName: student.full_name, level: student.level ?? "" },
      components: (comps ?? []).map((c) => ({ id: c.id, name: c.name, maxMarks: Number(c.max_marks) })),
      assessment: m ? { id: m.id, status: m.status, scores } : null,
      heldBy,
    },
    error: null,
  };
}

/** Validates chapter scores against the exam's real chapters (never the browser's numbers). */
export function validateComponentScores(
  scores: Record<string, number>,
  components: { id: string; max_marks: number }[],
  requireAll: boolean,
): { error: string | null; clean: Record<string, number> } {
  const maxById = new Map(components.map((c) => [c.id, Number(c.max_marks)]));
  const clean: Record<string, number> = {};
  for (const [id, raw] of Object.entries(scores)) {
    const max = maxById.get(id);
    if (max === undefined) return { error: "A score was submitted for a chapter that is not part of this exam.", clean: {} };
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > max) return { error: `Each chapter score must be between 0 and its maximum (${max}).`, clean: {} };
    clean[id] = Math.round(value * 10) / 10;
  }
  if (requireAll) {
    const missing = components.filter((c) => !(c.id in clean)).length;
    if (missing > 0) return { error: `Enter a score for every chapter before submitting (${missing} left). Use 0 where nothing was submitted.`, clean: {} };
  }
  return { error: null, clean };
}

export async function saveProjectAssessment(
  supabase: SupabaseClient,
  input: { examId: string; studentId: string; meId: string; scores: Record<string, number>; submit: boolean },
): Promise<{ error: string | null; status: SlotStatus | null; total: number | null }> {
  const fail = (error: string) => ({ error, status: null, total: null });

  const [{ data: exam }, { data: comps }] = await Promise.all([
    supabase.from("exams").select("status, exam_type").eq("id", input.examId).maybeSingle(),
    supabase.from("exam_project_components").select("id, max_marks").eq("exam_id", input.examId),
  ]);
  if (!exam || exam.exam_type !== "practical_and_project") return fail("This examination has no project component.");
  if (exam.status === "closed") return fail("This examination is closed. Ask the Admin to make changes.");
  if (exam.status === "draft") return fail("This examination has not been opened yet.");

  const checked = validateComponentScores(input.scores, comps ?? [], input.submit);
  if (checked.error) return fail(checked.error);

  // Find or claim this student's project.
  let { data: mine } = await supabase
    .from("project_assessments")
    .select("id, status")
    .eq("exam_id", input.examId)
    .eq("student_id", input.studentId)
    .eq("csa_id", input.meId)
    .maybeSingle();
  if (!mine) {
    const { data: created, error } = await supabase
      .from("project_assessments")
      .insert({ exam_id: input.examId, student_id: input.studentId, csa_id: input.meId, status: "draft", score: 0 })
      .select("id, status")
      .single();
    if (error || !created) {
      if (error?.code === "23505") return fail("Another CSA is already scoring this student's project.");
      return fail(dbMessage(error, "Could not start the project assessment."));
    }
    mine = created;
  }
  if (mine.status !== "draft") return fail("This project score was already submitted and is locked. Ask the Admin to correct it.");

  const { error: deleteError } = await supabase.from("project_component_scores").delete().eq("project_assessment_id", mine.id);
  if (deleteError) return fail(deleteError.message);
  const rows = Object.entries(checked.clean).map(([component_id, score]) => ({ project_assessment_id: mine.id, component_id, score }));
  if (rows.length > 0) {
    const { error } = await supabase.from("project_component_scores").insert(rows);
    if (error) return fail(error.message);
  }

  const total = Math.round(Object.values(checked.clean).reduce((s, v) => s + v, 0) * 10) / 10;
  const newStatus: SlotStatus = input.submit ? "submitted" : "draft";
  const { error: updateError } = await supabase
    .from("project_assessments")
    .update({ status: newStatus, submitted_at: input.submit ? new Date().toISOString() : null })
    .eq("id", mine.id)
    .eq("status", "draft");
  if (updateError) return fail(updateError.message);

  if (input.submit) {
    await supabase.from("audit_log").insert({
      entity_type: "project_assessment",
      entity_id: mine.id,
      action: "submit",
      actor_id: input.meId,
      new_value: { chapters: checked.clean, total, status: newStatus },
    });
  }
  return { error: null, status: newStatus, total };
}
