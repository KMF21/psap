"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import type { AdminProjectEditRow } from "@/lib/supabase/scoring";
import { adminEditProjectAction, type AdminProjectEditState } from "./actions";

export function ProjectEditForm({ examId, studentId, rows }: { examId: string; studentId: string; rows: AdminProjectEditRow[] }) {
  const bound = adminEditProjectAction.bind(null, examId, studentId);
  const [state, formAction, isPending] = useActionState<AdminProjectEditState, FormData>(bound, { error: null });

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div className="flex items-start gap-2 rounded-lg p-4 text-sm" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
        <ShieldAlert size={18} className="mt-0.5 shrink-0" />
        <p>Changes are logged with the previous and new values, and the score is marked &quot;Amended&quot;.</p>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border bg-surface">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-ink">{r.csaName}</p>
              <p className="text-xs text-ink-faint capitalize">{r.status}</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="number"
                name={`score_${r.id}`}
                defaultValue={r.score ?? 0}
                min={0}
                max={r.maxMarks}
                step="0.5"
                className="w-24 rounded-lg border border-border bg-surface px-3 py-2 text-right text-sm tabular text-ink"
              />
              <span className="tabular">/ {r.maxMarks}</span>
            </label>
          </div>
        ))}
      </div>

      {state.error && <p className="text-sm" style={{ color: "var(--danger)" }}>{state.error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? "Saving…" : "Save correction"}
        </button>
        <Link href={`/admin/results/${examId}`} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-ink hover:bg-surface">
          Cancel
        </Link>
      </div>
    </form>
  );
}
