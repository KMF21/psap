"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Lock, Save, Undo2 } from "lucide-react";
import type { SkillScoringData } from "@/lib/supabase/draws";
import { scaleScore } from "@/lib/types";
import { discardDraftAction, saveSkillAction } from "@/app/csa/actions";

function quickValues(max: number): number[] | null {
  // Tap buttons for small whole-number steps; type for anything else.
  if (max > 5 || !Number.isInteger(max)) return null;
  return Array.from({ length: max + 1 }, (_, i) => i);
}

export function ScoreClient({ data, backHref }: { data: SkillScoringData; backHref: string }) {
  const router = useRouter();
  const a = data.assessment!;
  const [status, setStatus] = useState(a.status);
  const [scores, setScores] = useState<Record<string, string>>(Object.fromEntries(Object.entries(a.stepScores).map(([k, v]) => [k, String(v)])));
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const locked = status !== "draft" || data.examStatus === "closed";
  const raw = Math.round(data.steps.reduce((s, st) => s + (Number(scores[st.id]) || 0), 0) * 10) / 10;
  const scaled = scaleScore(raw, data.nativeTotal, data.assignedMarks);
  const filled = data.steps.filter((st) => scores[st.id] !== undefined && scores[st.id] !== "").length;

  function setStep(id: string, value: string, max: number) {
    if (value === "") return setScores((p) => ({ ...p, [id]: "" }));
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    setScores((p) => ({ ...p, [id]: String(Math.max(0, Math.min(n, max))) }));
  }

  function save(submit: boolean) {
    if (submit && !window.confirm(`Submit ${data.skillName} for ${data.student.fullName}?\n\nScore: ${scaled} / ${data.assignedMarks}. After submitting, only the Admin can change it.`)) return;
    setMessage(null);
    const payload: Record<string, number> = {};
    for (const [k, v] of Object.entries(scores)) if (v !== "") payload[k] = Number(v);
    startTransition(async () => {
      const result = await saveSkillAction(data.examId, data.student.id, a.id, payload, submit);
      if (result.error) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setStatus(result.status ?? status);
      if (submit) router.push(backHref);
      else setMessage({ tone: "ok", text: "Draft saved." });
    });
  }

  function discard() {
    if (!window.confirm(`Discard this draft? Use this if the wrong paper number was entered. ${data.skillName} will be freed for this student.`)) return;
    startTransition(async () => {
      const result = await discardDraftAction(data.examId, data.student.id, a.id);
      if (result.error) setMessage({ tone: "error", text: result.error });
      else router.push(backHref);
    });
  }

  return (
    <div className="pb-2">
      {locked && (
        <p className="mb-3 flex items-start gap-2 rounded-lg p-3 text-sm" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
          <Lock size={15} className="mt-0.5 shrink-0" />
          {data.examStatus === "closed" && status === "draft"
            ? "This examination is closed. Ask the Admin to make changes."
            : `This assessment is ${status === "amended" ? "corrected by the Admin" : "submitted"} and locked. Only the Admin can change it.`}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <ol className="divide-y divide-border">
          {data.steps.map((st, i) => {
            const quick = quickValues(st.maxMarks);
            const value = scores[st.id] ?? "";
            return (
              <li key={st.id} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-ink">
                    <span className="mr-1.5 text-xs font-semibold tabular text-ink-faint">{i + 1}.</span>
                    {st.description}
                  </p>
                  <span className="shrink-0 text-xs tabular text-ink-faint">/ {st.maxMarks}</span>
                </div>
                {quick ? (
                  <div className="mt-2.5 flex flex-wrap gap-2" role="radiogroup" aria-label={`Score for step ${i + 1}`}>
                    {quick.map((v) => {
                      const active = value !== "" && Number(value) === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          disabled={locked}
                          onClick={() => setStep(st.id, String(v), st.maxMarks)}
                          className="h-11 min-w-11 rounded-md border px-3 text-base font-semibold tabular disabled:opacity-60"
                          style={active ? { background: "var(--accent)", color: "white", borderColor: "var(--accent)" } : { borderColor: "var(--border)", color: "var(--ink)" }}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={st.maxMarks}
                    step={0.5}
                    value={value}
                    disabled={locked}
                    onChange={(e) => setStep(st.id, e.target.value, st.maxMarks)}
                    aria-label={`Score for step ${i + 1}`}
                    placeholder={`0 – ${st.maxMarks}`}
                    className="mt-2.5 h-11 w-32 rounded-md border border-border bg-bg px-3 text-right text-base tabular text-ink disabled:opacity-60"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {message && (
        <p
          className="mt-3 flex items-start gap-2 rounded-lg p-3 text-sm"
          style={message.tone === "ok" ? { background: "var(--success-soft)", color: "var(--success)" } : { background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          {message.tone === "ok" ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
          {message.text}
        </p>
      )}

      {!locked && (
        <button type="button" onClick={discard} disabled={isPending} className="mt-4 flex items-center gap-1.5 text-sm font-medium text-ink-muted disabled:opacity-50">
          <Undo2 size={14} /> Wrong paper number? Discard this draft
        </button>
      )}

      {/* Sticky score bar for one-handed use on phones */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-border bg-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] sm:mx-0 sm:rounded-lg sm:border">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-ink-faint">{filled}/{data.steps.length} steps · raw {raw}/{data.nativeTotal}</p>
            <p className="text-xl font-bold tabular" style={{ color: "var(--accent-ink)" }}>
              {scaled} <span className="text-sm font-medium text-ink-muted">/ {data.assignedMarks}</span>
            </p>
          </div>
          {locked ? (
            <Link href={backHref} className="rounded-md border border-border px-4 py-3 text-sm font-medium text-ink">Back</Link>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => save(false)} disabled={isPending} className="rounded-md border border-border px-3 py-3 text-sm font-medium text-ink disabled:opacity-50">
                Save
              </button>
              <button
                onClick={() => save(true)}
                disabled={isPending || filled < data.steps.length}
                className="flex items-center gap-1.5 rounded-md px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--accent)" }}
                title={filled < data.steps.length ? "Score every step first" : undefined}
              >
                <Save size={15} /> {isPending ? "…" : "Submit"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
