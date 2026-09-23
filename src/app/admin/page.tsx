import { LayoutDashboard, Users, ClipboardCheck, Clock, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/supabase/dashboard";

export default async function AdminDashboard() {
  let stats: Awaited<ReturnType<typeof getDashboardData>>["stats"] = {
    totalStudents: 0,
    activeExams: 0,
    totalExams: 0,
    totalSubmitted: 0,
    totalAwaiting: 0,
  };
  let exams: Awaited<ReturnType<typeof getDashboardData>>["exams"] = [];
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const result = await getDashboardData(supabase);
    stats = result.stats;
    exams = result.exams;
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  return (
    <div>
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle="Overview across all courses and academic sessions"
      />

      {error ? (
        <div
          className="flex items-start gap-3 rounded-lg border p-5 text-sm"
          style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load dashboard data.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total students" value={String(stats.totalStudents)} icon={Users} delta="Across all active exams" />
            <StatCard
              label="Active examinations"
              value={String(stats.activeExams)}
              icon={ClipboardCheck}
              accent="var(--warn)"
              delta={`${stats.totalExams} total configured`}
            />
            <StatCard label="Assessments submitted" value={String(stats.totalSubmitted)} icon={ClipboardCheck} accent="var(--success)" delta="Across all exams" />
            <StatCard label="Awaiting scoring" value={String(stats.totalAwaiting)} icon={Clock} accent="var(--danger)" delta="Eligible students not yet submitted" />
          </div>

          <div className="mt-8 rounded-lg border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">Examinations</h2>
            </div>
            {exams.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-faint">No examinations configured yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-ink-faint">
                    <th className="px-5 py-3 font-medium">Examination</th>
                    <th className="px-5 py-3 font-medium">Course</th>
                    <th className="px-5 py-3 font-medium">Session</th>
                    <th className="px-5 py-3 font-medium">Practical / Project</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => (
                    <tr key={exam.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3.5 font-medium text-ink">{exam.title}</td>
                      <td className="px-5 py-3.5 text-ink-muted">{exam.courseCode}</td>
                      <td className="px-5 py-3.5 text-ink-muted">{exam.academicSession}</td>
                      <td className="px-5 py-3.5 tabular text-ink-muted">
                        {exam.practicalTargetTotal} {exam.projectMaxTotal > 0 && `+ ${exam.projectMaxTotal}`}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusPill status={exam.status === "open" ? "submitted" : exam.status === "closed" ? "amended" : "draft"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
