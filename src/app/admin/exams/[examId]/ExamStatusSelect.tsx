"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { updateExamStatusAction } from "./actions";

const statusStyles = {
  draft: { bg: "var(--neutral-soft)", fg: "var(--ink-muted)" },
  open: { bg: "var(--success-soft)", fg: "var(--success)" },
  closed: { bg: "var(--accent-soft)", fg: "var(--accent-ink)" },
} as const;

type Status = "draft" | "open" | "closed";

export function ExamStatusSelect({ examId, initialStatus }: { examId: string; initialStatus: Status }) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const style = statusStyles[status];

  function handleChange(next: Status) {
    const previous = status;
    setStatus(next); // optimistic
    setError(null);
    startTransition(async () => {
      const result = await updateExamStatusAction(examId, next);
      if (result.error) {
        setStatus(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <label className="flex items-center gap-2 text-xs text-ink-muted">
        Status
        <select
          value={status}
          disabled={isPending}
          onChange={(e) => handleChange(e.target.value as Status)}
          className="rounded-full border-0 px-3 py-1.5 text-sm font-medium disabled:opacity-60"
          style={{ background: style.bg, color: style.fg }}
        >
          <option value="draft">Draft</option>
          <option value="open">Open — CSAs can score</option>
          <option value="closed">Closed — scores locked</option>
        </select>
      </label>
      {error && (
        <p className="flex max-w-xs items-start gap-1.5 text-xs sm:text-right" style={{ color: "var(--danger)" }}>
          <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
