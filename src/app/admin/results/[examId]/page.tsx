import { FileBarChart, AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Toolbar } from "@/components/ui/Toolbar";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getResultsData } from "@/lib/supabase/results";

export default async function ExamResultsPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;

  let data: Awaited<ReturnType<typeof getResultsData>>["data"] = null;
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const result = await getResultsData(supabase, examId);
    data = result.data;
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  if (error) {
    return (
      <div>
        <PageHeader icon={FileBarChart} title="Results" breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Results", href: "/admin/results" }]} />
        <div
          className="flex items-start gap-3 rounded-lg border p-5 text-sm"
          style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load results.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) notFound();

  const hasProject = data.projectMaxTotal > 0;
  const grandTotalMax = data.practicalTargetTotal + data.projectMaxTotal;

  return (
    <div>
      <PageHeader
        icon={FileBarChart}
        title="Results"
        subtitle={data.examTitle}
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Results", href: "/admin/results" },
          { label: data.examTitle },
        ]}
      />

      <div className="rounded-lg border border-border bg-surface">
        <Toolbar searchPlaceholder="Search by name or reg. number…" showExport />
        {data.rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-faint">No eligible students for this examination yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-faint">
                <th className="px-5 py-3 font-medium">Student</th>
                {data.skillColumns.map((col) => (
                  <th key={col.examSkillId} className="px-4 py-3 text-right font-medium">
                    {col.skillName.split(" ").slice(0, 2).join(" ")}
                    <div className="font-normal text-ink-faint">/ {col.assignedMarks}</div>
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium">
                  Practical
                  <div className="font-normal text-ink-faint">/ {data.practicalTargetTotal}</div>
                </th>
                {hasProject && (
                  <th className="px-4 py-3 text-right font-medium">
                    Project
                    <div className="font-normal text-ink-faint">/ {data.projectMaxTotal}</div>
                  </th>
                )}
                <th className="px-5 py-3 text-right font-medium">
                  Total
                  <div className="font-normal text-ink-faint">/ {grandTotalMax}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.studentId} className="border-b border-border last:border-0">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-ink">{row.fullName}</p>
                    <p className="text-xs tabular text-ink-faint">{row.registrationNumber}</p>
                  </td>
                  {row.skillScores.map((score, i) => (
                    <td key={data.skillColumns[i].examSkillId} className="px-4 py-3.5 text-right tabular text-ink-muted">
                      {score ?? "—"}
                    </td>
                  ))}
                  <td className="px-4 py-3.5 text-right font-semibold tabular text-ink">{row.practicalTotal}</td>
                  {hasProject && (
                    <td className="px-4 py-3.5 text-right tabular text-ink-muted">
                      {row.projectScores.length > 0 ? (
                        <>
                          {row.projectTotal}
                          <span className="ml-1 text-xs text-ink-faint">({row.projectScores.join("+")})</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  <td className="px-5 py-3.5 text-right font-semibold tabular text-ink">{row.grandTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
