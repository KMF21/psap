// Types mirror the Postgres schema in the PSAP technical spec (Section 2).
// Keeping these 1:1 with the DB means the eventual Supabase client swap-in
// requires no reshaping of the UI layer.

export type Role = "admin" | "csa";

export interface User {
  id: string;
  fullName: string;
  role: Role;
  email: string;
  isActive: boolean;
}

export interface Course {
  id: string;
  code: string; // e.g. 'CHE116'
  title: string;
}

export interface SkillStep {
  id: string;
  skillId: string;
  stepOrder: number;
  description: string;
  maxMarks: number;
}

export interface Skill {
  id: string;
  name: string;
  nativeTotal: number;
  timeAllowedMinutes: number;
  isActive: boolean;
  steps: SkillStep[];
}

export type ExamStatus = "draft" | "open" | "closed";
export type ExamType = "practical_only" | "practical_and_project";

export interface Exam {
  id: string;
  courseId: string;
  academicSession: string;
  title: string;
  examType: ExamType;
  practicalTargetTotal: number;
  projectMaxTotal: number;
  status: ExamStatus;
}

export interface ExamSkill {
  id: string;
  examId: string;
  skillId: string;
  assignedMarks: number;
  isCompulsory: boolean;
  displayOrder: number;
  assignedCsaIds: string[];
}

export interface Student {
  id: string;
  registrationNumber: string;
  fullName: string;
  level: string;
  photoUrl?: string;
}

export type AssessmentStatus = "pending" | "draft" | "submitted" | "amended";

export interface SkillAssessment {
  id: string;
  examSkillId: string;
  studentId: string;
  csaId: string;
  rawScore: number | null;
  scaledScore: number | null;
  status: AssessmentStatus;
  submittedAt?: string;
}

export interface ProjectAssessment {
  id: string;
  examId: string;
  studentId: string;
  csaId: string;
  score: number | null;
  maxMarks: number;
  status: AssessmentStatus;
  submittedAt?: string;
}

// ---- Derived / computed shapes used by the UI ----

export interface StudentExamResult {
  student: Student;
  exam: Exam;
  skills: {
    skillName: string;
    assignedMarks: number;
    scaledScore: number | null;
    status: AssessmentStatus;
    csaName: string;
  }[];
  practicalTotal: number;
  practicalMax: number;
  project: {
    csaName: string;
    score: number | null;
    maxMarks: number;
    status: AssessmentStatus;
  }[];
  projectTotal: number;
  projectMax: number;
}

/** (raw / nativeTotal) * assignedMarks — Option A proportional scaling. */
export function scaleScore(raw: number, nativeTotal: number, assignedMarks: number): number {
  if (nativeTotal === 0) return 0;
  return Math.round(((raw / nativeTotal) * assignedMarks) * 10) / 10;
}

/**
 * Server-side check of submitted step scores against the skill's real steps.
 * Never trust scores posted from the browser: every key must be a step of this
 * skill and every value must be a finite number between 0 and that step's max.
 */
export function validateStepScores(
  stepScores: Record<string, number>,
  steps: { id: string; max_marks: number }[],
): { error: string | null; clean: Record<string, number> } {
  const maxById = new Map(steps.map((s) => [s.id, Number(s.max_marks)]));
  const clean: Record<string, number> = {};
  for (const [stepId, raw] of Object.entries(stepScores)) {
    const max = maxById.get(stepId);
    if (max === undefined) return { error: "A score was submitted for a step that is not part of this skill.", clean: {} };
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > max) {
      return { error: `Each step score must be between 0 and its maximum marks (${max}).`, clean: {} };
    }
    clean[stepId] = Math.round(value * 10) / 10;
  }
  return { error: null, clean };
}
