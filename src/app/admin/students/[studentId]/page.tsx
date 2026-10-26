import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, GraduationCap, Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStudentHistory, type StudentHistoryExam } from "@/lib/supabase/students";

const statusLabel: Record<StudentHistoryExam["status"], string> = { draft: "Draft", open: "Open", closed: "Closed" };

export default async function StudentHistoryPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;

  let result: Awaited<ReturnType<typeof getStudentHistory>> | null = null;
  let error: string | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    result = await getStudentHistory(supabase, studentId);
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  if (error) {
    return (
      <div>
        <PageHeader icon={GraduationCap} title="Student" breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Students", href: "/admin/students" }]} />
        <div className="flex items-start gap-3 rounded-lg border p-5 text-sm" style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}>
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load this student.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  if (!result || !result.student) notFound();
  const { student, exams } = result;

  return (
    <div>
      <PageHeader
        icon={GraduationCap}
        title={student.fullName}
        subtitle={`${student.registrationNumber}${student.level ? ` · ${student.level}` : ""} · ${exams.length} examination${exams.length === 1 ? "" : "s"}`}
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Students", href: "/admin/students" }, { label: student.fullName }]}
        action={
          <Link
            href={`/admin/students/${student.id}/edit`}
            className="flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm font-medium text-ink hover:bg-surface"
          >
            <Pencil size={14} /> Edit student
          </Link>
        }
      />

      {exams.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-10 text-center text-sm text-ink-faint">
          This student hasn&apos;t been made eligible for any examination yet.
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((e) => (
            <section key={e.examId} className="rounded-lg border border-border bg-surface">
              <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-ink">{e.title}</h2>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {e.courseCode} · {e.session} · {statusLabel[e.status]}
                  </p>
                </div>
                <Link href={`/admin/results/${e.examId}`} className="text-sm font-medium text-accent-ink hover:underline">
                  Open exam results →
                </Link>
              </div>

              <ul className="divide-y divide-border">
                {e.skills.map((k) => (
                  <li key={k.skillName} className="flex items-center justify-between gap-4 px-4 py-3 text-sm sm:px-5">
                    <span className="min-w-0 text-ink">{k.skillName}</span>
                    <span className="shrink-0 tabular text-ink-muted">
                      {k.score === null ? "—" : k.score} <span className="text-ink-faint">/ {k.assignedMarks}</span>
                    </span>
                  </li>
                ))}
                {e.projectMax > 0 && (
                  <li className="flex items-center justify-between gap-4 px-4 py-3 text-sm sm:px-5">
                    <span className="text-ink">
                      Project assessment
                      {e.projectScores.length > 0 && <span className="ml-1 text-xs text-ink-faint">({e.projectScores.join(" + ")})</span>}
                    </span>
                    <span className="shrink-0 tabular text-ink-muted">
                      {e.projectScores.length === 0 ? "—" : e.projectTotal} <span className="text-ink-faint">/ {e.projectMax}</span>
                    </span>
                  </li>
                )}
              </ul>

              <div className="flex items-baseline justify-between gap-4 rounded-b-lg px-4 py-3.5 sm:px-5" style={{ background: "var(--accent-soft)" }}>
                <span className="text-sm font-semibold" style={{ color: "var(--accent-ink)" }}>Total</span>
                <span className="text-lg font-bold tabular" style={{ color: "var(--accent-ink)" }}>
                  {e.grandTotal} <span className="text-sm font-medium opacity-75">/ {e.grandMax}</span>
                </span>
              </div>
            </section>
          ))}
          <p className="text-xs text-ink-faint">Only submitted or corrected scores are shown; drafts and unscored skills appear as “—”.</p>
        </div>
      )}
    </div>
  );
}
