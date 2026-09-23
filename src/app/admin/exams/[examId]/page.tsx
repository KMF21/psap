import { ClipboardList, Plus, AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getExamDetail } from "@/lib/supabase/exams";

export default async function ExamDetailPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;

  let exam: Awaited<ReturnType<typeof getExamDetail>>["exam"] = null;
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const result = await getExamDetail(supabase, examId);
    exam = result.exam;
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  if (error) {
    return (
      <div>
        <PageHeader
          icon={ClipboardList}
          title="Examination"
          breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Examinations", href: "/admin/exams" }]}
        />
        <div
          className="flex items-start gap-3 rounded-lg border p-5 text-sm"
          style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load this examination from the database.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!exam) notFound();

  const totalAssigned = exam.skills.reduce((sum, es) => sum + es.assignedMarks, 0);
  const isBalanced = totalAssigned === exam.practicalTargetTotal;

  return (
    <div>
      <PageHeader
        icon={ClipboardList}
        title={exam.title}
        subtitle={`${exam.courseCode} · ${exam.academicSession}`}
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
                    — doesn&apos;t sum to target yet
                  </span>
                )}
              </p>
            </div>
            <button className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-bg">
              <Plus size={13} /> Add skill
            </button>
          </div>
          {exam.skills.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-faint">No skills assigned to this examination yet.</p>
          ) : (
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
                {exam.skills.map((es) => (
                  <tr key={es.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 text-ink">{es.skillName}</td>
                    <td className="px-5 py-3 font-semibold tabular text-ink">{es.assignedMarks}</td>
                    <td className="px-5 py-3 tabular text-ink-faint">/ {es.skillNativeTotal}</td>
                    <td className="px-5 py-3 text-ink-muted">
                      {es.assignedCsaNames.length > 0 ? es.assignedCsaNames.join(", ") : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {es.isCompulsory && (
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                          Compulsory
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
