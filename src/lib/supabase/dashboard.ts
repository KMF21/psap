import type { SupabaseClient } from "@supabase/supabase-js";
import { getExams, type ExamListItem } from "./exams";
import { fetchAll } from "./paging";

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
    .in("status", ["submitted", "amended"]);
  if (submittedError) {
    return { stats: { totalStudents: 0, activeExams: 0, totalExams: 0, totalSubmitted: 0, totalAwaiting: 0 }, exams: [], error: submittedError.message };
  }

  // "Awaiting" = practical slots still to be submitted across all exams:
  // each eligible student needs the compulsory skill (if set) plus N draws.
  const [{ data: examRows, error: exError }, { data: compRows, error: compError }, { data: eligRows, error: eligError }] = await Promise.all([
    supabase.from("exams").select("id, draws_per_student"),
    supabase.from("exam_skills").select("exam_id").eq("is_compulsory", true),
    fetchAll<{ exam_id: string }>((from, to) => supabase.from("exam_eligibility").select("exam_id").order("id").range(from, to)),
  ]);
  const firstError = exError?.message ?? compError?.message ?? eligError;
  if (firstError) {
    return { stats: { totalStudents: 0, activeExams: 0, totalExams: 0, totalSubmitted: 0, totalAwaiting: 0 }, exams: [], error: firstError };
  }
  const hasCompulsory = new Set((compRows ?? []).map((r) => r.exam_id as string));
  const eligibleByExam = new Map<string, number>();
  for (const r of eligRows) eligibleByExam.set(r.exam_id, (eligibleByExam.get(r.exam_id) ?? 0) + 1);
  let slotsNeeded = 0;
  for (const e of examRows ?? []) {
    slotsNeeded += (eligibleByExam.get(e.id) ?? 0) * ((hasCompulsory.has(e.id) ? 1 : 0) + Number(e.draws_per_student ?? 0));
  }
  const totalAwaiting = Math.max(slotsNeeded - (totalSubmitted ?? 0), 0);

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
