"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronRight, FolderCheck, Hash, Lock, Star } from "lucide-react";
import type { BoardSkill, BoardSlot, BoardStudent, ExamBoard } from "@/lib/supabase/draws";
import { claimSkillAction } from "@/app/csa/actions";

function SlotRow({
  title,
  slot,
  href,
  onStart,
  busy,
  emptyName,
}: {
  title: string;
  slot: BoardSlot | null;
  href: string | null;
  onStart?: () => void;
  busy?: boolean;
  emptyName?: string;
}) {
  const done = slot && slot.status !== "draft";
  const heldByOther = slot && !slot.mine;
  const body = (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-bold tabular"
        style={done ? { background: "var(--success-soft)", color: "var(--success)" } : slot ? { background: "var(--warn-soft)", color: "var(--warn)" } : { background: "var(--neutral-soft)", color: "var(--ink-faint)" }}
      >
        {slot?.paperNumber ?? (title === "Compulsory" ? <Star size={16} /> : "?")}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-faint">{title}</p>
        <p className="truncate font-medium text-ink">{slot ? slot.skillName : (emptyName ?? "Not recorded yet")}</p>
        {slot ? (
          <p className="text-xs text-ink-muted">
            {done ? "Submitted" : "In progress"} · {slot.mine ? "you" : slot.csaName}
          </p>
        ) : (
          onStart && <p className="text-xs font-medium" style={{ color: "var(--accent-ink)" }}>{busy ? "Starting…" : "Tap to start scoring"}</p>
        )}
      </div>
      {done || heldByOther ? <Lock size={16} className="text-ink-faint" /> : <ChevronRight size={18} className="text-ink-faint" />}
    </div>
  );
  if (href && slot && slot.mine) return <Link href={href} className="block active:bg-bg">{body}</Link>;
  if (!slot && onStart) {
    return (
      <button type="button" onClick={onStart} disabled={busy} className="block w-full text-left active:bg-bg disabled:opacity-60">
        {body}
      </button>
    );
  }
  return body;
}

export function StudentClient({ board, student }: { board: ExamBoard; student: BoardStudent }) {
  const router = useRouter();
  const [paper, setPaper] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const base = `/csa/exams/${board.examId}/students/${student.id}`;
  const canScore = board.status === "open";

  const drawnIds = new Set(student.draws.map((d) => d.examSkillId));
  const drawsLeft = Math.max(board.drawsPerStudent - student.draws.length, 0);
  const match: BoardSkill | null = useMemo(() => {
    const n = Number(paper);
    if (!paper || !Number.isInteger(n)) return null;
    return board.pool.find((s) => s.paperNumber === n) ?? null;
  }, [paper, board.pool]);
  const alreadyDrawn = match ? drawnIds.has(match.examSkillId) : false;

  function start(examSkillId: string) {
    setError(null);
    startTransition(async () => {
      const result = await claimSkillAction(board.examId, student.id, examSkillId);
      if (result.error) {
        setError(result.error);
        router.refresh();
        return;
      }
      router.push(`${base}/skills/${examSkillId}`);
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="flex items-start gap-2 rounded-lg p-3 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}
      {student.complete && (
        <p className="flex items-start gap-2 rounded-lg p-3 text-sm" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> This student is fully assessed.
        </p>
      )}

      {/* Practical */}
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Practical</h2>
          <span className="text-xs tabular text-ink-muted">{student.practicalDone}/{student.practicalNeeded} submitted</span>
        </div>
        <div className="divide-y divide-border">
          {board.compulsory && (
            <SlotRow
              title="Compulsory"
              slot={student.compulsory ?? null}
              href={`${base}/skills/${board.compulsory.examSkillId}`}
              onStart={canScore ? () => start(board.compulsory!.examSkillId) : undefined}
              busy={isPending}
              emptyName={board.compulsory.skillName}
            />
          )}
          {student.draws.map((d, i) => (
            <SlotRow key={d.examSkillId} title={`Draw ${d.drawOrder ?? i + 1}`} slot={d} href={`${base}/skills/${d.examSkillId}`} />
          ))}
        </div>
      </section>

      {/* Record the next draw */}
      {drawsLeft > 0 && canScore && (
        <section className="rounded-lg border-2 bg-surface p-4" style={{ borderColor: "var(--accent)" }}>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Hash size={15} /> Record draw {student.draws.length + 1} of {board.drawsPerStudent}
          </h2>
          <p className="mt-1 text-xs text-ink-muted">Enter the number on the paper the student picked.</p>
          <input
            value={paper}
            onChange={(e) => setPaper(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            placeholder="Paper number"
            aria-label="Paper number"
            className="mt-3 w-full rounded-md border border-border bg-bg px-4 py-3.5 text-center text-2xl font-bold tabular text-ink placeholder:text-base placeholder:font-normal placeholder:text-ink-faint"
          />
          {paper && (
            <div className="mt-3">
              {!match ? (
                <p className="rounded-md p-3 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                  No skill in this exam has paper number {paper}. Check the paper again.
                </p>
              ) : alreadyDrawn ? (
                <p className="rounded-md p-3 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                  {student.fullName} has already been assessed on #{match.paperNumber} {match.skillName}. Ask them to draw again.
                </p>
              ) : (
                <div className="rounded-md p-3" style={{ background: "var(--accent-soft)" }}>
                  <p className="text-xs" style={{ color: "var(--accent-ink)" }}>Paper #{match.paperNumber} is</p>
                  <p className="text-lg font-semibold text-ink">{match.skillName}</p>
                  <p className="text-xs text-ink-muted">{match.assignedMarks} marks</p>
                  <button
                    type="button"
                    onClick={() => start(match.examSkillId)}
                    disabled={isPending}
                    className="mt-3 w-full rounded-md px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: "var(--accent)" }}
                  >
                    {isPending ? "Starting…" : "Correct — start scoring"}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Project */}
      {board.hasProject && (
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          {student.project && !student.project.mine ? (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <FolderCheck size={20} className="text-ink-faint" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">Project</p>
                <p className="text-xs text-ink-muted">
                  {student.project.status === "draft" ? "Being scored" : "Submitted"} by {student.project.csaName}
                </p>
              </div>
              <Lock size={16} className="text-ink-faint" />
            </div>
          ) : (
            <Link href={`${base}/project`} className="flex items-center gap-3 px-4 py-3.5 active:bg-bg">
              <FolderCheck size={20} className="text-ink-faint" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">Project</p>
                <p className="text-xs text-ink-muted">
                  {!student.project ? "Not scored yet — score chapter by chapter" : student.project.status === "draft" ? "In progress · you" : "Submitted · you"}
                </p>
              </div>
              <ChevronRight size={18} className="text-ink-faint" />
            </Link>
          )}
        </section>
      )}

      <Link href={`/csa/exams/${board.examId}`} className="block rounded-md border border-border py-3 text-center text-sm font-medium text-ink">
        ← Back to all students
      </Link>
    </div>
  );
}
