"use client";

import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import type { BoardSlot, BoardStudent } from "@/lib/supabase/draws";
import { releaseDraftAction } from "./actions";

function SlotChip({ slot, label, onRelease, busy }: { slot: BoardSlot | null; label: string; onRelease: (s: BoardSlot) => void; busy: boolean }) {
  if (!slot) {
    return (
      <span className="inline-flex items-center rounded-md border border-dashed border-border px-2 py-1 text-xs text-ink-faint">{label}: —</span>
    );
  }
  const done = slot.status !== "draft";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs"
      style={done ? { background: "var(--success-soft)", color: "var(--success)" } : { background: "var(--warn-soft)", color: "var(--warn)" }}
      title={`${slot.skillName} · ${done ? "submitted" : "in progress"} by ${slot.csaName}`}
    >
      <span className="font-semibold">{slot.paperNumber !== null ? `#${slot.paperNumber}` : label}</span>
      <span className="max-w-[9rem] truncate">{slot.skillName}</span>
      {!done && (
        <button
          type="button"
          onClick={() => onRelease(slot)}
          disabled={busy}
          className="ml-0.5 rounded px-1 font-medium underline decoration-dotted underline-offset-2 disabled:opacity-50"
        >
          release
        </button>
      )}
    </span>
  );
}

export function ProgressTable({
  examId,
  students,
  hasCompulsory,
  hasProject,
  drawsPerStudent,
}: {
  examId: string;
  students: BoardStudent[];
  hasCompulsory: boolean;
  hasProject: boolean;
  drawsPerStudent: number;
}) {
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<"pending" | "all">("pending");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter(
      (s) =>
        (show === "all" || !s.complete) &&
        (!q || s.fullName.toLowerCase().includes(q) || s.registrationNumber.toLowerCase().includes(q)),
    );
  }, [students, query, show]);

  function release(slot: BoardSlot) {
    if (!window.confirm(`Release "${slot.skillName}"? ${slot.csaName}'s unsubmitted draft will be deleted so another CSA can score it.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await releaseDraftAction(examId, slot.assessmentId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reg. number or name…"
            className="w-full rounded-md border border-border bg-bg py-2.5 pl-8 pr-3 text-base text-ink placeholder:text-ink-faint sm:py-2 sm:text-sm"
          />
        </div>
        <div className="flex rounded-md border border-border p-0.5 text-sm">
          {(["pending", "all"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setShow(v)}
              className="flex-1 rounded px-3 py-1.5 font-medium sm:flex-none"
              style={show === v ? { background: "var(--accent-soft)", color: "var(--accent-ink)" } : { color: "var(--ink-muted)" }}
            >
              {v === "pending" ? "Not yet complete" : "Everyone"}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="m-4 rounded-md p-3 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p>}

      {filtered.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-ink-faint">{show === "pending" ? "Everyone shown is fully assessed." : "No students match."}</p>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((s) => {
            const drawsLeft = Math.max(drawsPerStudent - s.draws.length, 0);
            return (
              <li key={s.id} className="px-4 py-3.5 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{s.fullName}</p>
                    <p className="text-xs tabular text-ink-faint">{s.registrationNumber}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold tabular" style={{ color: s.complete ? "var(--success)" : "var(--ink-muted)" }}>
                    {s.practicalDone}/{s.practicalNeeded} practical{hasProject && ` · project ${s.project && s.project.status !== "draft" ? "✓" : "—"}`}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {hasCompulsory && <SlotChip slot={s.compulsory} label="Compulsory" onRelease={release} busy={isPending} />}
                  {s.draws.map((d) => (
                    <SlotChip key={d.examSkillId} slot={d} label={`Draw ${d.drawOrder}`} onRelease={release} busy={isPending} />
                  ))}
                  {Array.from({ length: drawsLeft }, (_, i) => (
                    <SlotChip key={`empty-${i}`} slot={null} label={`Draw ${s.draws.length + i + 1}`} onRelease={release} busy={isPending} />
                  ))}
                </div>
                {hasProject && s.project && (
                  <p className="mt-1.5 text-xs text-ink-muted">Project: {s.project.status === "draft" ? "in progress" : "submitted"} by {s.project.csaName}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
