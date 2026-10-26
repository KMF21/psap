import { FileBarChart, AlertTriangle, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { ExportButtons } from "./ExportButtons";
import { ResultSheetButton } from "./ResultSheetButton";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getResultsData } from "@/lib/supabase/results";

export default async function ExamResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { examId } = await params;
  const { q } = await searchParams;

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
  const needle = (q ?? "").trim().toLowerCase();
  const visibleRows = needle
    ? data.rows.filter((r) => r.fullName.toLowerCase().includes(needle) || r.registrationNumber.toLowerCase().includes(needle))
    : data.rows;
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
        <FilterBar
          searchPlaceholder="Search name or reg. number…"
          rightSlot={<ExportButtons data={data} />}
          resultNote={needle ? `Showing ${visibleRows.length} of ${data.rows.length} students (exports always include everyone)` : `${data.rows.length} students`}
        />
        {visibleRows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-faint">
            {needle ? "No students match your search." : "No eligible students for this examination yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-faint">
                <th className="sticky left-0 z-10 bg-surface px-4 py-3 font-medium sm:px-5">Student</th>
                {data.skillColumns.map((col) => (
                  <th key={col.examSkillId} className="min-w-[7.5rem] max-w-[10rem] whitespace-normal px-3 py-3 text-right align-bottom text-xs font-medium leading-tight sm:px-4 sm:text-sm">
                    {col.skillName}
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
                <th className="w-10 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.studentId} className="border-b border-border last:border-0">
                  <td className="sticky left-0 z-10 bg-surface px-4 py-3.5 sm:px-5">
                    <Link href={`/admin/students/${row.studentId}`} className="font-medium text-ink hover:text-accent-ink hover:underline">
                      {row.fullName}
                    </Link>
                    <p className="text-xs tabular text-ink-faint">{row.registrationNumber}</p>
                  </td>
                  {row.skillScores.map((score, i) => (
                    <td key={data.skillColumns[i].examSkillId} className="px-4 py-3.5 text-right tabular text-ink-muted">
                      {score === null ? (
                        "—"
                      ) : (
                        <Link
                          href={`/admin/results/${examId}/edit/${data.skillColumns[i].examSkillId}/${row.studentId}`}
                          className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 hover:text-accent-ink hover:decoration-solid"
                          title="Correct this score"
                        >
                          {score}
                          <Pencil size={11} className="text-ink-faint" />
                        </Link>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3.5 text-right font-semibold tabular text-ink">{row.practicalTotal}</td>
                  {hasProject && (
                    <td className="px-4 py-3.5 text-right tabular text-ink-muted">
                      {row.projectScores.length > 0 ? (
                        <Link
                          href={`/admin/results/${examId}/project/${row.studentId}`}
                          className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 hover:text-accent-ink hover:decoration-solid"
                          title="Correct this project score"
                        >
                          {row.projectTotal}
                          <span className="text-xs text-ink-faint">({row.projectScores.join("+")})</span>
                          <Pencil size={11} className="text-ink-faint" />
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  <td className="px-5 py-3.5 text-right font-semibold tabular text-ink">{row.grandTotal}</td>
                  <td className="px-3 py-3.5 text-center">
                    <ResultSheetButton data={data} row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
