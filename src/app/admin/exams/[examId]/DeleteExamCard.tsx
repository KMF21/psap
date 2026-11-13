"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { deleteExamAction } from "./actions";

export function DeleteExamCard({ examId, title, eligibleCount }: { examId: string; title: string; eligibleCount: number }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteExamAction(examId, typed);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <section className="rounded-lg border p-4 sm:p-5" style={{ borderColor: "var(--danger-soft)" }}>
      <h2 className="text-sm font-semibold" style={{ color: "var(--danger)" }}>Delete this examination</h2>
      <p className="mt-1 text-xs text-ink-muted">
        Removes the exam, its roster ({eligibleCount} student{eligibleCount !== 1 ? "s" : ""}), skills, chapters and every score in it.
        Students stay in the student list. Export the results first if you need a copy.
      </p>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 w-full rounded-md border px-4 py-2.5 text-sm font-medium sm:w-auto"
          style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
        >
          Delete examination…
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <label htmlFor="confirm-title" className="block text-xs text-ink-muted">
            Type the exam title <strong className="text-ink">{title}</strong> to confirm:
          </label>
          <input
            id="confirm-title"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="w-full rounded-md border border-border bg-bg px-3 py-2.5 text-base text-ink sm:text-sm"
          />
          {error && (
            <p className="flex items-start gap-1.5 text-xs" style={{ color: "var(--danger)" }}>
              <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {error}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={remove}
              disabled={isPending || typed.trim() !== title.trim()}
              className="rounded-md px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "var(--danger)" }}
            >
              {isPending ? "Deleting…" : "Permanently delete"}
            </button>
            <button onClick={() => { setOpen(false); setTyped(""); }} className="rounded-md border border-border px-4 py-2.5 text-sm font-medium text-ink">
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
