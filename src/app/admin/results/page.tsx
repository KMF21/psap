import { FileBarChart, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getExams } from "@/lib/supabase/exams";

export default async function ResultsIndexPage() {
  let exams: Awaited<ReturnType<typeof getExams>>["exams"] = [];
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const result = await getExams(supabase);
    exams = result.exams;
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  return (
    <div>
      <PageHeader
        icon={FileBarChart}
        title="Results"
        subtitle="Select an examination to view its combined result breakdown"
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Results" }]}
      />

      {error ? (
        <div
          className="flex items-start gap-3 rounded-lg border p-5 text-sm"
          style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load examinations.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      ) : exams.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-10 text-center text-sm text-ink-faint">
          No examinations configured yet.
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <Link
              key={exam.id}
              href={`/admin/results/${exam.id}`}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-5 hover:border-accent"
            >
              <div>
                <p className="text-sm font-semibold text-ink">{exam.title}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {exam.courseCode} · {exam.academicSession} · {exam.skillCount} skill{exam.skillCount !== 1 ? "s" : ""}
                </p>
              </div>
              <p className="text-sm font-medium tabular text-accent-ink">View results →</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
