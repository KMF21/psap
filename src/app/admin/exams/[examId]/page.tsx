import { ClipboardList, Plus } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { exams, courses, examSkills, skills, csas } from "@/lib/mock-data";

export default async function ExamDetailPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const exam = exams.find((e) => e.id === examId);
  if (!exam) notFound();

  const course = courses.find((c) => c.id === exam.courseId);
  const assignedSkills = examSkills.filter((es) => es.examId === exam.id);
  const totalAssigned = assignedSkills.reduce((sum, es) => sum + es.assignedMarks, 0);
  const isBalanced = totalAssigned === exam.practicalTargetTotal;

  return (
    <div>
      <PageHeader
        icon={ClipboardList}
        title={exam.title}
        subtitle={`${course?.code} · ${exam.academicSession}`}
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Examinations", href: "/admin/exams" },
          { label: exam.title },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-ink">Skills in this examination</h2>
              <p className="text-xs text-ink-muted">
                Assigned {totalAssigned} of {exam.practicalTargetTotal} target practical marks
                {!isBalanced && (
                  <span className="ml-1.5 font-medium" style={{ color: "var(--warn)" }}>
                    — doesn't sum to target yet
                  </span>
                )}
              </p>
            </div>
            <button className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-bg">
              <Plus size={13} /> Add skill
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-faint">
                <th className="px-5 py-2.5 font-medium">Skill</th>
                <th className="px-5 py-2.5 font-medium">Assigned marks</th>
                <th className="px-5 py-2.5 font-medium">Native total</th>
                <th className="px-5 py-2.5 font-medium">CSA</th>
                <th className="px-5 py-2.5 font-medium">Compulsory</th>
              </tr>
            </thead>
            <tbody>
              {assignedSkills.map((es) => {
                const skill = skills.find((s) => s.id === es.skillId);
                const assignedCsas = csas.filter((c) => es.assignedCsaIds.includes(c.id));
                return (
                  <tr key={es.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 text-ink">{skill?.name}</td>
                    <td className="px-5 py-3 font-semibold tabular text-ink">{es.assignedMarks}</td>
                    <td className="px-5 py-3 tabular text-ink-faint">/ {skill?.nativeTotal}</td>
                    <td className="px-5 py-3 text-ink-muted">{assignedCsas.map((c) => c.fullName).join(", ")}</td>
                    <td className="px-5 py-3">
                      {es.isCompulsory && (
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                          Compulsory
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-ink">Score structure</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Practical total</dt>
                <dd className="font-medium tabular text-ink">{exam.practicalTargetTotal}</dd>
              </div>
              {exam.projectMaxTotal > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Project total</dt>
                  <dd className="font-medium tabular text-ink">{exam.projectMaxTotal}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="font-medium text-ink">Grand total</dt>
                <dd className="font-semibold tabular text-ink">{exam.practicalTargetTotal + exam.projectMaxTotal}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-ink">Eligible students</h3>
            <p className="mt-1 text-xs text-ink-muted">Manage which students can be assessed for this exam.</p>
            <button className="mt-3 w-full rounded-md border border-border py-2 text-sm font-medium text-ink hover:bg-bg">
              Manage eligibility
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
