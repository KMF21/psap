"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { AdminProjectEditData } from "@/lib/supabase/scoring";
import { adminEditProjectAction, type AdminProjectEditState } from "./actions";

export function ProjectEditForm({ examId, studentId, data }: { examId: string; studentId: string; data: AdminProjectEditData }) {
  const boundAction = adminEditProjectAction.bind(null, examId, studentId);
  const [state, formAction, isPending] = useActionState<AdminProjectEditState, FormData>(boundAction, { error: null });
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(data.scores).map(([k, v]) => [k, String(v)])),
  );
  const total = Math.round(data.components.reduce((s, c) => s + (Number(scores[c.id]) || 0), 0) * 10) / 10;
  const max = data.components.reduce((s, c) => s + c.maxMarks, 0);

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-start gap-2 rounded-lg p-4 text-sm" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
        <ShieldAlert size={18} className="mt-0.5 shrink-0" />
        <p>
          {data.assessmentId
            ? <>Scored by {data.csaName ?? "a CSA"} ({data.status}). Saving overrides it as Admin; each chapter&apos;s old and new value is logged and the status becomes &quot;Amended&quot;.</>
            : <>No CSA has scored this project yet. Scores you enter are recorded under your name as an Admin entry.</>}
        </p>
      </div>

      <form action={formAction} className="rounded-lg border border-border bg-surface">
        {state.error && (
          <p className="flex items-start gap-2 border-b border-border p-4 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {state.error}
          </p>
        )}
        <div className="divide-y divide-border">
          {data.components.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{c.name}</p>
                <p className="text-xs text-ink-faint">Max {c.maxMarks}</p>
              </div>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={c.maxMarks}
                step={0.5}
                name={`chapter_${c.id}`}
                required
                value={scores[c.id] ?? ""}
                onChange={(e) => setScores((prev) => ({ ...prev, [c.id]: e.target.value }))}
                aria-label={`Score for ${c.name}`}
                className="h-11 w-20 shrink-0 rounded-md border border-border bg-bg px-3 text-right text-base tabular text-ink sm:h-auto sm:py-1.5 sm:text-sm"
                placeholder="0"
              />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 border-t border-border bg-bg/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-xs text-ink-faint">Project total</p>
            <p className="text-lg font-semibold tabular" style={{ color: "var(--accent-ink)" }}>{total} / {max}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button type="submit" disabled={isPending} className="rounded-md px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60" style={{ background: "var(--accent)" }}>
              {isPending ? "Saving…" : "Save"}
            </button>
            <Link href={`/admin/results/${examId}`} className="rounded-md border border-border px-4 py-2.5 text-center text-sm font-medium text-ink hover:bg-bg">
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
