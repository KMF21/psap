import type { ExamListItem } from "@/lib/supabase/exams";

export interface ExamFilterParams {
  q?: string;
  session?: string;
  course?: string;
  status?: string;
}

export function filterExams(exams: ExamListItem[], f: ExamFilterParams): ExamListItem[] {
  const needle = (f.q ?? "").trim().toLowerCase();
  return exams.filter(
    (e) =>
      (!needle || e.title.toLowerCase().includes(needle) || e.courseCode.toLowerCase().includes(needle)) &&
      (!f.session || e.academicSession === f.session) &&
      (!f.course || e.courseCode === f.course) &&
      (!f.status || e.status === f.status),
  );
}

/** Distinct sessions (newest label first) and course codes present in the data. */
export function examFilterOptions(exams: ExamListItem[]) {
  const sessions = [...new Set(exams.map((e) => e.academicSession).filter((s) => s !== "—"))].sort().reverse();
  const courses = [...new Set(exams.map((e) => e.courseCode).filter((c) => c !== "—"))].sort();
  return {
    sessions: sessions.map((s) => ({ value: s, label: s })),
    courses: courses.map((c) => ({ value: c, label: c })),
  };
}
