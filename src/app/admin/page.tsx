import { LayoutDashboard, Users, ClipboardCheck, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { exams, students, skillAssessments, courses } from "@/lib/mock-data";

export default function AdminDashboard() {
  const submitted = skillAssessments.filter((a) => a.status === "submitted").length;
  const pending = skillAssessments.filter((a) => a.status !== "submitted").length;

  return (
    <div>
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle="Overview across all courses and academic sessions"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total students" value={String(students.length)} icon={Users} delta="Across all active exams" />
        <StatCard label="Active examinations" value={String(exams.filter((e) => e.status === "open").length)} icon={ClipboardCheck} accent="var(--warn)" delta={`${exams.length} total configured`} />
        <StatCard label="Assessments submitted" value={String(submitted)} icon={ClipboardCheck} accent="var(--success)" delta="This session" />
        <StatCard label="Awaiting scoring" value={String(pending)} icon={Clock} accent="var(--danger)" delta="Draft or not yet started" />
      </div>

      <div className="mt-8 rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">Examinations</h2>
        </div>
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
            {exams.map((exam) => {
              const course = courses.find((c) => c.id === exam.courseId);
              return (
                <tr key={exam.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3.5 font-medium text-ink">{exam.title}</td>
                  <td className="px-5 py-3.5 text-ink-muted">{course?.code}</td>
                  <td className="px-5 py-3.5 text-ink-muted">{exam.academicSession}</td>
                  <td className="px-5 py-3.5 tabular text-ink-muted">
                    {exam.practicalTargetTotal} {exam.projectMaxTotal > 0 && `+ ${exam.projectMaxTotal}`}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusPill status={exam.status === "open" ? "submitted" : exam.status === "closed" ? "amended" : "draft"} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
