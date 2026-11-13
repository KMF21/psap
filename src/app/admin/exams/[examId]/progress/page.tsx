import { BarChart3, AlertTriangle, CheckCircle2, Clock, PencilLine } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getExamBoard } from "@/lib/supabase/draws";
import { ProgressTable } from "./ProgressTable";

export const dynamic = "force-dynamic";

export default async function ExamProgressPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  let board: Awaited<ReturnType<typeof getExamBoard>>["board"] = null;
  let error: string | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    const result = await getExamBoard(supabase, examId, null);
    board = result.board;
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }
  if (!error && !board) notFound();

  const total = board?.students.length ?? 0;
  const complete = board?.students.filter((s) => s.complete).length ?? 0;
  const inProgress =
    board?.students.reduce((n, s) => n + [s.compulsory, ...s.draws].filter((x) => x && x.status === "draft").length, 0) ?? 0;

  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="Live progress"
        subtitle={board?.title}
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Examinations", href: "/admin/exams" },
          { label: board?.title ?? "Exam", href: `/admin/exams/${examId}` },
          { label: "Progress" },
        ]}
      />
      {error || !board ? (
        <div className="flex items-start gap-3 rounded-lg border p-5 text-sm" style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}>
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard icon={CheckCircle2} label="Fully assessed" value={`${complete} / ${total}`} accent="var(--success)" />
            <StatCard icon={Clock} label="Still to finish" value={String(total - complete)} accent="var(--warn)" />
            <StatCard icon={PencilLine} label="Skills in progress (drafts)" value={String(inProgress)} />
          </div>
          <p className="mb-3 text-xs text-ink-muted">
            “Release” deletes a CSA&apos;s unsubmitted draft so another CSA can take that student and skill — use it if a CSA left mid-exam. Submitted scores are corrected from Results.
          </p>
          <ProgressTable examId={examId} students={board.students} hasCompulsory={board.compulsory !== null} hasProject={board.hasProject} drawsPerStudent={board.drawsPerStudent} />
        </>
      )}
    </div>
  );
}
