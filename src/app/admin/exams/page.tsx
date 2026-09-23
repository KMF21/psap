import { ClipboardList, Plus, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getExams } from "@/lib/supabase/exams";

export default async function ExamsPage() {
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
        icon={ClipboardList}
        title="Examinations"
        subtitle="Configure exam structures, skill mark allocation, and CSA assignments"
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Examinations" }]}
        action={
          <Link
            href="/admin/exams/new"
            className="flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium text-white"
            style={{ background: "var(--accent)" }}
          >
            <Plus size={15} /> Create examination
          </Link>
        }
      />

      {error ? (
        <div
          className="flex items-start gap-3 rounded-lg border p-5 text-sm"
          style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load examinations from the database.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      ) : exams.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-10 text-center text-sm text-ink-faint">
          No examinations configured yet.
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => (
            <Link
              key={exam.id}
              href={`/admin/exams/${exam.id}`}
              className="block rounded-lg border border-border bg-surface p-5 transition-colors hover:border-accent"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">{exam.title}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {exam.courseCode} · {exam.academicSession} · {exam.skillCount} skill{exam.skillCount !== 1 ? "s" : ""} configured
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular text-ink">
                      {exam.practicalTargetTotal}{exam.projectMaxTotal > 0 && ` + ${exam.projectMaxTotal}`}
                    </p>
                    <p className="text-xs text-ink-faint">practical{exam.projectMaxTotal > 0 && " + project"}</p>
                  </div>
                  <StatusPill status={exam.status === "open" ? "submitted" : exam.status === "closed" ? "amended" : "draft"} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
