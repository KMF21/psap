"use client";

import { useState, useTransition } from "react";
import { updateExamStatusAction } from "./actions";

const statusStyles = {
  draft: { bg: "var(--neutral-soft)", fg: "var(--ink-muted)" },
  open: { bg: "var(--success-soft)", fg: "var(--success)" },
  closed: { bg: "var(--accent-soft)", fg: "var(--accent-ink)" },
} as const;

export function ExamStatusSelect({ examId, initialStatus }: { examId: string; initialStatus: "draft" | "open" | "closed" }) {
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const style = statusStyles[status];

  function handleChange(next: "draft" | "open" | "closed") {
    const previous = status;
    setStatus(next); // optimistic
    startTransition(async () => {
      const result = await updateExamStatusAction(examId, next);
      if (result.error) setStatus(previous); // revert on failure
    });
  }

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) => handleChange(e.target.value as "draft" | "open" | "closed")}
      className="rounded-full border-0 px-3 py-1 text-xs font-medium disabled:opacity-60"
      style={{ background: style.bg, color: style.fg }}
    >
      <option value="draft">Draft</option>
      <option value="open">Open</option>
      <option value="closed">Closed</option>
    </select>
  );
}
