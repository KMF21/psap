"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { CsaOption } from "@/lib/supabase/exams";
import { setExamCsasAction } from "./actions";

export function ExamCsasCard({ examId, allCsas, initialIds }: { examId: string; allCsas: CsaOption[]; initialIds: string[] }) {
  const [selected, setSelected] = useState(new Set(initialIds));
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const dirty = selected.size !== initialIds.length || initialIds.some((id) => !selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await setExamCsasAction(examId, [...selected]);
      setMessage(result.error ? { tone: "error", text: result.error } : { tone: "ok", text: "CSAs updated." });
    });
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">CSAs on this exam</h2>
        <span className="text-xs tabular text-ink-faint">{selected.size} selected</span>
      </div>
      <p className="mt-1 text-xs text-ink-muted">Any CSA ticked here can score any skill and the project for any student on the roster.</p>

      {allCsas.length === 0 ? (
        <p className="mt-4 text-sm text-ink-faint">
          No active CSA accounts yet. <Link href="/admin/csas" className="font-medium text-accent-ink hover:underline">Invite CSAs</Link>
        </p>
      ) : (
        <ul className="mt-3 max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border">
          {allCsas.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-3 text-sm">
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="h-4 w-4" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{c.fullName}</span>
                  {c.email && <span className="block truncate text-xs text-ink-faint">{c.email}</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {message && (
        <p
          className="mt-3 flex items-start gap-2 rounded-md p-3 text-sm"
          style={message.tone === "ok" ? { background: "var(--success-soft)", color: "var(--success)" } : { background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          {message.tone === "ok" ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
          {message.text}
        </p>
      )}
      {allCsas.length > 0 && (
        <button
          onClick={save}
          disabled={!dirty || isPending}
          className="mt-3 w-full rounded-md px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 sm:w-auto"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? "Saving…" : "Save CSAs"}
        </button>
      )}
    </section>
  );
}
