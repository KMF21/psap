"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRightLeft, CheckCircle2, ShieldAlert, Unlock } from "lucide-react";
import type { AdminEditData } from "@/lib/supabase/scoring";
import { adminEditAssessmentAction, adminReassignAction, adminReleaseAction, type AdminEditState } from "./actions";

export function AdminEditForm({ data, justReassigned }: { data: AdminEditData; justReassigned: boolean }) {
  const boundAction = adminEditAssessmentAction.bind(null, data.examId, data.assessmentId!);
  const [state, formAction, isPending] = useActionState<AdminEditState, FormData>(boundAction, { error: null });
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(data.stepScores).map(([k, v]) => [k, String(v)])),
  );
  const [target, setTarget] = useState("");
  const [sideError, setSideError] = useState<string | null>(null);
  const [sidePending, startSide] = useTransition();

  const rawScore = Math.round(data.steps.reduce((sum, step) => sum + (Number(scores[step.id]) || 0), 0) * 10) / 10;
  const scaled = data.nativeTotal > 0 ? Math.round((rawScore / data.nativeTotal) * data.assignedMarks * 10) / 10 : 0;
  const isDraft = data.currentStatus === "draft";
  const slotLabel = data.isCompulsory ? "Compulsory" : `Paper #${data.paperNumber}`;

  function reassign() {
    const option = data.reassignOptions.find((o) => o.examSkillId === target);
    if (!option) return;
    if (!window.confirm(`Move this assessment from ${slotLabel} ${data.skillName} to ${option.label}?\n\nThe step scores will be cleared (they belong to the old rubric) and it reopens as a draft for ${data.submittedByCsaName ?? "the CSA"} to rescore. The old record is kept in the audit log.`)) return;
    setSideError(null);
    startSide(async () => {
      const result = await adminReassignAction(data.examId, data.assessmentId!, target, data.studentId);
      if (result?.error) setSideError(result.error);
    });
  }

  function release() {
    if (!window.confirm(`Release this draft? ${data.submittedByCsaName ?? "The CSA"}'s unsubmitted scores are deleted so another CSA can take this student and skill.`)) return;
    setSideError(null);
    startSide(async () => {
      const result = await adminReleaseAction(data.examId, data.assessmentId!);
      if (result?.error) setSideError(result.error);
    });
  }

  return (
    <div className="max-w-2xl space-y-4">
      {justReassigned && (
        <p className="flex items-start gap-2 rounded-lg p-4 text-sm" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          Reassigned. It is now a draft on this skill — the CSA can rescore it, or you can enter the scores below.
        </p>
      )}
      <div className="flex items-start gap-2 rounded-lg p-4 text-sm" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
        <ShieldAlert size={18} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">
            {slotLabel}: {data.skillName} — {isDraft ? "in progress" : data.currentStatus} by {data.submittedByCsaName ?? "an unknown CSA"}
          </p>
          <p className="mt-1 opacity-90">
            Saving here overrides it as Admin. The previous and new values are logged in the audit trail and the status becomes &quot;Amended&quot;
            (locked for CSAs).
          </p>
        </div>
      </div>

      <form action={formAction} className="rounded-lg border border-border bg-surface">
        {state.error && (
          <p className="flex items-start gap-2 border-b border-border p-4 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {state.error}
          </p>
        )}
        <div className="divide-y divide-border">
          {data.steps.map((step, i) => (
            <div key={step.id} className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
              <div className="min-w-0">
                <p className="text-sm text-ink"><span className="mr-1.5 text-xs tabular text-ink-faint">{i + 1}.</span>{step.description}</p>
                <p className="text-xs text-ink-faint">Max {step.maxMarks}</p>
              </div>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={step.maxMarks}
                step={0.5}
                name={`step_${step.id}`}
                value={scores[step.id] ?? ""}
                onChange={(e) => setScores((prev) => ({ ...prev, [step.id]: e.target.value }))}
                aria-label={`Score for: ${step.description}`}
                className="h-11 w-20 shrink-0 rounded-md border border-border bg-bg px-3 text-right text-base tabular text-ink sm:h-auto sm:py-1.5 sm:text-sm"
                placeholder="0"
              />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 border-t border-border bg-bg/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-ink-faint">Raw score</p>
              <p className="text-lg font-semibold tabular text-ink">{rawScore} / {data.nativeTotal}</p>
            </div>
            <div>
              <p className="text-xs text-ink-faint">Scaled ({data.assignedMarks} marks)</p>
              <p className="text-lg font-semibold tabular" style={{ color: "var(--accent-ink)" }}>{scaled}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button type="submit" disabled={isPending} className="rounded-md px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60" style={{ background: "var(--accent)" }}>
              {isPending ? "Saving…" : "Save correction"}
            </button>
            <Link href={`/admin/results/${data.examId}`} className="rounded-md border border-border px-4 py-2.5 text-center text-sm font-medium text-ink hover:bg-bg">
              Cancel
            </Link>
          </div>
        </div>
      </form>

      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><ArrowRightLeft size={15} /> Wrong paper number recorded?</h2>
        <p className="mt-1 text-xs text-ink-muted">Move this assessment to the skill the student actually drew.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            aria-label="Correct skill"
            className="w-full rounded-md border border-border bg-bg px-3 py-2.5 text-base text-ink sm:max-w-sm sm:text-sm"
          >
            <option value="">Choose the correct skill…</option>
            {data.reassignOptions.map((o) => (
              <option key={o.examSkillId} value={o.examSkillId} disabled={o.taken}>
                {o.label}{o.taken ? " — already recorded for this student" : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={reassign}
            disabled={!target || sidePending}
            className="rounded-md border border-border px-4 py-2.5 text-sm font-medium text-ink hover:bg-bg disabled:opacity-50"
          >
            {sidePending ? "Working…" : "Reassign"}
          </button>
        </div>
        {isDraft && (
          <div className="mt-4 border-t border-border pt-4">
            <button
              type="button"
              onClick={release}
              disabled={sidePending}
              className="flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-danger disabled:opacity-50"
            >
              <Unlock size={14} /> Release this draft instead
            </button>
          </div>
        )}
        {sideError && <p className="mt-3 text-sm" style={{ color: "var(--danger)" }}>{sideError}</p>}
      </section>
    </div>
  );
}
