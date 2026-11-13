"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Lock, Save } from "lucide-react";
import type { ProjectScoringData } from "@/lib/supabase/draws";
import { saveProjectAction } from "@/app/csa/actions";

export function ProjectClient({ data, backHref }: { data: ProjectScoringData; backHref: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(data.assessment?.status ?? "draft");
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(data.assessment?.scores ?? {}).map(([k, v]) => [k, String(v)])),
  );
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const locked = status !== "draft" || data.examStatus !== "open";
  const total = Math.round(data.components.reduce((s, c) => s + (Number(scores[c.id]) || 0), 0) * 10) / 10;
  const max = data.components.reduce((s, c) => s + c.maxMarks, 0);
  const filled = data.components.filter((c) => (scores[c.id] ?? "") !== "").length;

  function setChapter(id: string, value: string, maxMarks: number) {
    if (value === "") return setScores((p) => ({ ...p, [id]: "" }));
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    setScores((p) => ({ ...p, [id]: String(Math.max(0, Math.min(n, maxMarks))) }));
  }

  function save(submit: boolean) {
    if (submit && !window.confirm(`Submit the project for ${data.student.fullName}?\n\nTotal: ${total} / ${max}. After submitting, only the Admin can change it.`)) return;
    setMessage(null);
    const payload: Record<string, number> = {};
    for (const [k, v] of Object.entries(scores)) if (v !== "") payload[k] = Number(v);
    startTransition(async () => {
      const result = await saveProjectAction(data.examId, data.student.id, payload, submit);
      if (result.error) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setStatus(result.status ?? status);
      if (submit) router.push(backHref);
      else setMessage({ tone: "ok", text: "Draft saved." });
    });
  }

  return (
    <div className="pb-2">
      {locked && (
        <p className="mb-3 flex items-start gap-2 rounded-lg p-3 text-sm" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
          <Lock size={15} className="mt-0.5 shrink-0" />
          {data.examStatus !== "open" && status === "draft"
            ? data.examStatus === "closed" ? "This examination is closed. Ask the Admin to make changes." : "This examination hasn't been opened yet."
            : "This project score is submitted and locked. Only the Admin can change it."}
        </p>
      )}
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <ul className="divide-y divide-border">
          {data.components.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="min-w-0">
                <p className="font-medium text-ink">{c.name}</p>
                <p className="text-xs text-ink-faint">Max {c.maxMarks}</p>
              </div>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={c.maxMarks}
                step={0.5}
                value={scores[c.id] ?? ""}
                disabled={locked}
                onChange={(e) => setChapter(c.id, e.target.value, c.maxMarks)}
                aria-label={`Score for ${c.name}`}
                placeholder="—"
                className="h-12 w-24 shrink-0 rounded-md border border-border bg-bg px-3 text-right text-lg font-semibold tabular text-ink disabled:opacity-60"
              />
            </li>
          ))}
        </ul>
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

      <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-border bg-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] sm:mx-0 sm:rounded-lg sm:border">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-ink-faint">{filled}/{data.components.length} chapters scored</p>
            <p className="text-xl font-bold tabular" style={{ color: "var(--accent-ink)" }}>
              {total} <span className="text-sm font-medium text-ink-muted">/ {max}</span>
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
                disabled={isPending || filled < data.components.length}
                className="flex items-center gap-1.5 rounded-md px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--accent)" }}
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
