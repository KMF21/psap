import { FileBarChart, AlertTriangle, Pencil, BarChart3 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { ExportButtons } from "./ExportButtons";
import { ResultSheetButton } from "./ResultSheetButton";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getResultsData, type ResultCell } from "@/lib/supabase/results";

function ScoreCell({ examId, studentId, cell, showSkill = false }: { examId: string; studentId: string; cell: ResultCell | null; showSkill?: boolean }) {
  if (!cell) return <span className="text-ink-faint">—</span>;
  return (
    <Link
      href={`/admin/results/${examId}/edit/${cell.examSkillId}/${studentId}`}
      className="group block rounded-md hover:bg-bg"
      title={`${cell.skillName} · ${cell.status === "draft" ? "in progress" : cell.status} · ${cell.csaName}. Click to correct, reassign or release.`}
    >
      {showSkill && (
        <span className="block max-w-[10rem] truncate text-xs text-ink-muted">
          {cell.paperNumber !== null && <span className="font-semibold text-ink">#{cell.paperNumber} </span>}
          {cell.skillName}
        </span>
      )}
      <span className="inline-flex items-center gap-1 tabular">
        {cell.scaledScore === null ? (
          <span className="text-xs" style={{ color: "var(--warn)" }}>in progress</span>
        ) : (
          <span className="font-medium text-ink">{cell.scaledScore}</span>
        )}
        {cell.status === "amended" && <span className="text-[11px] text-ink-faint">corrected</span>}
        <Pencil size={11} className="text-ink-faint opacity-60 group-hover:opacity-100" />
      </span>
    </Link>
  );
}

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

  const needle = (q ?? "").trim().toLowerCase();
  const visibleRows = needle
    ? data.rows.filter((r) => r.fullName.toLowerCase().includes(needle) || r.registrationNumber.toLowerCase().includes(needle))
    : data.rows;
  const complete = data.rows.filter((r) => r.practicalComplete && (!data.hasProject || r.projectStatus === "submitted" || r.projectStatus === "amended")).length;

  return (
    <div>
      <PageHeader
        icon={FileBarChart}
        title="Results"
        subtitle={`${data.examTitle}${data.examLevel ? ` · ${data.examLevel}` : ""} · ${complete} of ${data.rows.length} fully assessed`}
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Results", href: "/admin/results" },
          { label: data.examTitle },
        ]}
        action={
          <Link href={`/admin/exams/${examId}/progress`} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-ink hover:bg-bg">
            <BarChart3 size={14} /> Live progress
          </Link>
        }
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
              <tr className="border-b border-border text-left align-bottom text-ink-faint">
                <th className="sticky left-0 z-10 bg-surface px-4 py-3 font-medium sm:px-5">Student</th>
                {data.compulsory && (
                  <th className="min-w-[8.5rem] px-3 py-3 font-medium">
                    Compulsory
                    <div className="max-w-[10rem] truncate font-normal text-ink-faint" title={data.compulsory.skillName}>
                      {data.compulsory.skillName} · /{data.compulsory.assignedMarks}
                    </div>
                  </th>
                )}
                {Array.from({ length: data.drawsPerStudent }, (_, i) => (
                  <th key={i} className="min-w-[8.5rem] px-3 py-3 font-medium">
                    Draw {i + 1}
                    {data.drawnMarks !== null && <div className="font-normal text-ink-faint">/ {data.drawnMarks}</div>}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium">
                  Practical
                  <div className="font-normal text-ink-faint">/ {data.practicalTargetTotal}</div>
                </th>
                {data.hasProject &&
                  data.components.map((c) => (
                    <th key={c.id} className="min-w-[4.5rem] px-2 py-3 text-right text-xs font-medium sm:text-sm">
                      <span className="block max-w-[6rem] truncate" title={c.name}>{c.name}</span>
                      <div className="font-normal text-ink-faint">/ {c.maxMarks}</div>
                    </th>
                  ))}
                {data.hasProject && (
                  <th className="px-4 py-3 text-right font-medium">
                    Project
                    <div className="font-normal text-ink-faint">/ {data.projectMaxTotal}</div>
                  </th>
                )}
                <th className="w-10 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.studentId} className="border-b border-border align-top last:border-0">
                  <td className="sticky left-0 z-10 bg-surface px-4 py-3.5 sm:px-5">
                    <Link href={`/admin/students/${row.studentId}`} className="font-medium text-ink hover:text-accent-ink hover:underline">
                      {row.fullName}
                    </Link>
                    <p className="text-xs tabular text-ink-faint">{row.registrationNumber}</p>
                  </td>
                  {data.compulsory && (
                    <td className="px-3 py-3.5">
                      <ScoreCell examId={examId} studentId={row.studentId} cell={row.compulsory} />
                    </td>
                  )}
                  {row.draws.map((cell, i) => (
                    <td key={i} className="px-3 py-3.5">
                      <ScoreCell examId={examId} studentId={row.studentId} cell={cell} showSkill />
                    </td>
                  ))}
                  <td className="px-4 py-3.5 text-right">
                    <span className="font-semibold tabular text-ink">{row.practicalTotal}</span>
                    {!row.practicalComplete && <p className="text-[11px] text-ink-faint">incomplete</p>}
                    {row.extraDraws.length > 0 && (
                      <p className="text-[11px]" style={{ color: "var(--warn)" }} title={row.extraDraws.map((c) => c.skillName).join(", ")}>
                        +{row.extraDraws.length} extra draw
                      </p>
                    )}
                  </td>
                  {data.hasProject &&
                    row.componentScores.map((v, i) => (
                      <td key={data.components[i].id} className="px-2 py-3.5 text-right tabular text-ink-muted">
                        {v === null ? "—" : v}
                      </td>
                    ))}
                  {data.hasProject && (
                    <td className="px-4 py-3.5 text-right tabular">
                      <Link
                        href={`/admin/results/${examId}/project/${row.studentId}`}
                        className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 hover:text-accent-ink hover:decoration-solid"
                        title={row.projectStatus ? "Correct chapter scores" : "Enter chapter scores"}
                      >
                        {row.projectStatus === "submitted" || row.projectStatus === "amended" ? (
                          <span className="font-semibold text-ink">{row.projectTotal}</span>
                        ) : row.projectStatus === "draft" ? (
                          <span className="text-xs" style={{ color: "var(--warn)" }}>in progress</span>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                        <Pencil size={11} className="text-ink-faint" />
                      </Link>
                      {row.projectStatus === "amended" && <p className="text-[11px] text-ink-faint">corrected</p>}
                    </td>
                  )}
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
