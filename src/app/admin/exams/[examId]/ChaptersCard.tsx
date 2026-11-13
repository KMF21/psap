"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Lock, Plus, Trash2 } from "lucide-react";
import type { ProjectComponent } from "@/lib/supabase/exams";
import { saveProjectComponentsAction } from "./actions";

type Row = { key: string; id: string | null; name: string; maxMarks: string };

export function ChaptersCard({ examId, initial, locked }: { examId: string; initial: ProjectComponent[]; locked: boolean }) {
  const toRows = (list: ProjectComponent[]): Row[] => list.map((c) => ({ key: c.id, id: c.id, name: c.name, maxMarks: String(c.maxMarks) }));
  const [rows, setRows] = useState<Row[]>(toRows(initial));
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const total = Math.round(rows.reduce((s, r) => s + (Number(r.maxMarks) || 0), 0) * 10) / 10;

  function update(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function add() {
    setRows((prev) => [...prev, { key: `new-${Date.now()}`, id: null, name: `Chapter ${prev.length + 1}`, maxMarks: "4" }]);
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveProjectComponentsAction(
        examId,
        rows.map((r) => ({ id: r.id, name: r.name, maxMarks: Number(r.maxMarks) })),
      );
      setMessage(result.error ? { tone: "error", text: result.error } : { tone: "ok", text: "Project chapters saved." });
    });
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Project chapters</h2>
        <span className="text-xs tabular text-ink-muted">Total {total}</span>
      </div>
      <p className="mt-1 text-xs text-ink-muted">One CSA scores every chapter for a student. The project total is the sum.</p>
      {locked && (
        <p className="mt-3 flex items-start gap-2 rounded-md p-2.5 text-xs" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
          <Lock size={13} className="mt-0.5 shrink-0" /> Project scores exist, so marks are locked. Chapter names can still be corrected.
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {rows.map((r, i) => (
          <li key={r.key} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-right text-xs tabular text-ink-faint">{i + 1}</span>
            <input
              value={r.name}
              onChange={(e) => update(r.key, { name: e.target.value })}
              aria-label={`Name of component ${i + 1}`}
              className="min-w-0 flex-1 rounded-md border border-border bg-bg px-3 py-2.5 text-base text-ink sm:py-2 sm:text-sm"
            />
            <input
              type="number"
              inputMode="decimal"
              min={0.5}
              step={0.5}
              value={r.maxMarks}
              disabled={locked}
              onChange={(e) => update(r.key, { maxMarks: e.target.value })}
              aria-label={`Maximum marks for ${r.name}`}
              className="w-20 shrink-0 rounded-md border border-border bg-bg px-2 py-2.5 text-right text-base tabular text-ink disabled:opacity-60 sm:py-2 sm:text-sm"
            />
            <button
              type="button"
              onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
              disabled={locked || rows.length <= 1}
              className="shrink-0 rounded-md p-2 text-ink-faint hover:bg-bg hover:text-danger disabled:opacity-30"
              aria-label={`Remove ${r.name}`}
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>

      {message && (
        <p
          className="mt-3 flex items-start gap-2 rounded-md p-3 text-sm"
          style={message.tone === "ok" ? { background: "var(--success-soft)", color: "var(--success)" } : { background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          {message.tone === "ok" ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
          {message.text}
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={add}
          disabled={locked}
          className="flex items-center justify-center gap-1.5 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-ink hover:bg-bg disabled:opacity-50"
        >
          <Plus size={14} /> Add chapter
        </button>
        <button
          onClick={save}
          disabled={isPending}
          className="rounded-md px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? "Saving…" : "Save chapters"}
        </button>
      </div>
    </section>
  );
}
