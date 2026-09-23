"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { AdminEditData } from "@/lib/supabase/scoring";
import { adminEditAssessmentAction, type AdminEditState } from "./actions";

export function AdminEditForm({ data }: { data: AdminEditData }) {
  const boundAction = adminEditAssessmentAction.bind(
    null,
    data.examId,
    data.examSkillId,
    data.assessmentId!,
    data.nativeTotal,
    data.assignedMarks,
    data.currentRawScore,
    data.currentScaledScore,
    data.currentStatus,
  );
  const [state, formAction, isPending] = useActionState<AdminEditState, FormData>(boundAction, { error: null });
  const [scores, setScores] = useState<Record<string, number>>(data.stepScores);

  const rawScore = data.steps.reduce((sum, step) => sum + (scores[step.id] ?? 0), 0);
  const scaled = data.nativeTotal > 0 ? Math.round(((rawScore / data.nativeTotal) * data.assignedMarks) * 10) / 10 : 0;

  return (
    <div className="max-w-2xl space-y-4">
      <div
        className="flex items-start gap-2 rounded-lg p-4 text-sm"
        style={{ background: "var(--warn-soft)", color: "var(--warn)" }}
      >
        <ShieldAlert size={18} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">You&apos;re overriding a {data.currentStatus} assessment as Admin.</p>
          <p className="mt-1 opacity-90">
            Originally submitted by {data.submittedByCsaName ?? "an unknown CSA"}. This change will be logged with the
            previous and new values in the audit trail, and the status will change to &quot;Amended&quot;.
          </p>
        </div>
      </div>

      <form action={formAction} className="rounded-lg border border-border bg-surface">
        {state.error && (
          <div
            className="flex items-start gap-2 border-b border-border p-4 text-sm"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <div className="divide-y divide-border">
          {data.steps.map((step) => (
            <div key={step.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-sm text-ink">{step.description}</p>
                <p className="text-xs text-ink-faint">Max {step.maxMarks} marks</p>
              </div>
              <input
                type="number"
                min={0}
                max={step.maxMarks}
                name={`step_${step.id}`}
                value={scores[step.id] ?? ""}
                onChange={(e) =>
                  setScores((prev) => ({ ...prev, [step.id]: Math.min(Number(e.target.value) || 0, step.maxMarks) }))
                }
                className="w-20 shrink-0 rounded-md border border-border bg-bg px-3 py-1.5 text-right text-sm tabular text-ink"
                placeholder="0"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-bg/50 px-5 py-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-ink-faint">Raw score</p>
              <p className="text-lg font-semibold tabular text-ink">{rawScore} / {data.nativeTotal}</p>
            </div>
            <div>
              <p className="text-xs text-ink-faint">Scaled to exam ({data.assignedMarks} marks)</p>
              <p className="text-lg font-semibold tabular" style={{ color: "var(--accent-ink)" }}>{scaled}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ background: "var(--accent)" }}
            >
              {isPending ? "Saving…" : "Save correction"}
            </button>
            <Link href={`/admin/results/${data.examId}`} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-bg">
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
