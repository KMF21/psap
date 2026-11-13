import { ClipboardCheck, AlertTriangle } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getExamBoard, getMyUserId } from "@/lib/supabase/draws";
import { BoardClient } from "./BoardClient";

export const dynamic = "force-dynamic";

export default async function CsaExamBoardPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const { userId } = await auth();

  let board: Awaited<ReturnType<typeof getExamBoard>>["board"] = null;
  let error: string | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    const meId = userId ? await getMyUserId(supabase, userId) : null;
    if (meId) {
      const result = await getExamBoard(supabase, examId, meId);
      board = result.board;
      error = result.error;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }
  if (!error && !board) notFound();

  return (
    <div>
      <PageHeader
        icon={ClipboardCheck}
        title={board?.title ?? "Examination"}
        subtitle={board ? `Compulsory + ${board.drawsPerStudent} drawn skill${board.drawsPerStudent !== 1 ? "s" : ""}${board.hasProject ? " + project" : ""}` : undefined}
        breadcrumb={[{ label: "My exams", href: "/csa" }, { label: board?.title ?? "Exam" }]}
      />
      {error || !board ? (
        <div className="flex items-start gap-3 rounded-lg border p-5 text-sm" style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}>
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      ) : (
        <>
          {board.status !== "open" && (
            <p className="mb-3 rounded-md p-3 text-sm" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
              {board.status === "closed" ? "This examination is closed. Scores can no longer be changed." : "This examination hasn't been opened yet. You can look, but scoring starts when the Admin opens it."}
            </p>
          )}
          <BoardClient board={board} />
        </>
      )}
    </div>
  );
}
