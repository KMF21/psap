import type { SupabaseClient } from "@supabase/supabase-js";
import { getExams, type ExamListItem } from "./exams";

export interface DashboardStats {
  totalStudents: number;
  activeExams: number;
  totalExams: number;
  totalSubmitted: number;
  totalAwaiting: number;
}

export async function getDashboardData(
  supabase: SupabaseClient,
): Promise<{ stats: DashboardStats; exams: ExamListItem[]; error: string | null }> {
  const { exams, error: examsError } = await getExams(supabase);
  if (examsError) {
    return { stats: { totalStudents: 0, activeExams: 0, totalExams: 0, totalSubmitted: 0, totalAwaiting: 0 }, exams: [], error: examsError };
  }

  const { count: totalStudents, error: studentsError } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true });
  if (studentsError) {
    return { stats: { totalStudents: 0, activeExams: 0, totalExams: 0, totalSubmitted: 0, totalAwaiting: 0 }, exams: [], error: studentsError.message };
  }

  const { count: totalSubmitted, error: submittedError } = await supabase
    .from("skill_assessments")
    .select("*", { count: "exact", head: true })
    .eq("status", "submitted");
  if (submittedError) {
    return { stats: { totalStudents: 0, activeExams: 0, totalExams: 0, totalSubmitted: 0, totalAwaiting: 0 }, exams: [], error: submittedError.message };
  }

  // "Awaiting" = eligible-student × exam-skill pairs that don't yet have a
  // submitted assessment — not just existing draft rows, since a student who
  // hasn't been scored at all yet (no row at all) is just as much "awaiting"
  // as one sitting in draft. Computed per exam_skill, same N+1 pattern as
  // getMyAssignments — fine at this app's scale (a handful of exam_skills).
  const { data: examSkillRows, error: esError } = await supabase.from("exam_skills").select("id, exam_id");
  if (esError) {
    return { stats: { totalStudents: 0, activeExams: 0, totalExams: 0, totalSubmitted: 0, totalAwaiting: 0 }, exams: [], error: esError.message };
  }

  let totalAwaiting = 0;
  for (const es of examSkillRows ?? []) {
    const [{ count: eligible }, { count: submitted }] = await Promise.all([
      supabase.from("exam_eligibility").select("*", { count: "exact", head: true }).eq("exam_id", es.exam_id),
      supabase.from("skill_assessments").select("*", { count: "exact", head: true }).eq("exam_skill_id", es.id).eq("status", "submitted"),
    ]);
    totalAwaiting += Math.max((eligible ?? 0) - (submitted ?? 0), 0);
  }

  return {
    stats: {
      totalStudents: totalStudents ?? 0,
      activeExams: exams.filter((e) => e.status === "open").length,
      totalExams: exams.length,
      totalSubmitted: totalSubmitted ?? 0,
      totalAwaiting,
    },
    exams,
    error: null,
  };
}
