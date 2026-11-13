"use client";

import { useState, useTransition } from "react";
import { ArrowRight, CheckCircle2, ChevronDown, Layers, AlertTriangle } from "lucide-react";
import type { LevelOption } from "@/lib/supabase/exams";
import { changeLevelAction } from "./level-actions";

const NONE = "__none__";

export function ChangeLevelCard({ levels, unset }: { levels: LevelOption[]; unset: number }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(levels[0]?.level ?? (unset > 0 ? NONE : ""));
  const [to, setTo] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const fromLabel = from === NONE ? "No level set" : from;
  const count = from === NONE ? unset : levels.find((l) => l.level === from)?.students ?? 0;
  const target = to.replace(/\s+/g, " ").trim();
  const mergesInto = levels.find((l) => l.level === target);
  const canRun = count > 0 && target.length > 0 && target !== from;

  function run() {
    const warning =
      `Move ${count} student${count !== 1 ? "s" : ""} from "${fromLabel}" to "${target}"?` +
      (mergesInto ? `\n\n${mergesInto.students} student${mergesInto.students !== 1 ? "s are" : " is"} already at "${target}"; they'll be grouped together.` : "") +
      "\n\nPast exams and scores are not changed. This is recorded in the audit log.";
    if (!window.confirm(warning)) return;
    setMessage(null);
    startTransition(async () => {
      const result = await changeLevelAction(from === NONE ? null : from, target);
      if (result.error) setMessage({ tone: "error", text: result.error });
      else {
        setMessage({ tone: "ok", text: `${result.changed} student${result.changed !== 1 ? "s" : ""} moved to ${target}.` });
        setTo("");
      }
    });
  }

  if (levels.length === 0 && unset === 0) return null;

  return (
    <section className="mb-4 rounded-lg border border-border bg-surface">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5" aria-expanded={open}>
        <span className="flex items-center gap-2.5">
          <Layers size={16} className="text-ink-faint" />
          <span>
            <span className="block text-sm font-semibold text-ink">Change level for a whole group</span>
            <span className="block text-xs text-ink-muted">E.g. move everyone in Year 2 to Year 3 at the start of a new session.</span>
          </span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-border p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap gap-1.5">
            {levels.map((l) => (
              <span key={l.level} className="rounded-full bg-bg px-2.5 py-1 text-xs text-ink-muted">
                {l.level} <span className="font-semibold tabular text-ink">{l.students}</span>
              </span>
            ))}
            {unset > 0 && (
              <span className="rounded-full px-2.5 py-1 text-xs" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
                No level <span className="font-semibold tabular">{unset}</span>
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="sm:w-56">
              <label htmlFor="level-from" className="mb-1.5 block text-xs font-medium text-ink-muted">Students currently at</label>
              <select
                id="level-from"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2.5 text-base text-ink sm:text-sm"
              >
                {levels.map((l) => (
                  <option key={l.level} value={l.level}>{l.level} ({l.students})</option>
                ))}
                {unset > 0 && <option value={NONE}>No level set ({unset})</option>}
              </select>
            </div>
            <ArrowRight size={16} className="hidden shrink-0 text-ink-faint sm:mb-3 sm:block" />
            <div className="sm:w-56">
              <label htmlFor="level-to" className="mb-1.5 block text-xs font-medium text-ink-muted">Move them to</label>
              <input
                id="level-to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                list="level-to-options"
                maxLength={60}
                autoComplete="off"
                placeholder="e.g. Year 3"
                className="w-full rounded-md border border-border bg-bg px-3 py-2.5 text-base text-ink placeholder:text-ink-faint sm:text-sm"
              />
              <datalist id="level-to-options">
                {levels.filter((l) => l.level !== from).map((l) => (
                  <option key={l.level} value={l.level} />
                ))}
              </datalist>
            </div>
            <button
              type="button"
              onClick={run}
              disabled={!canRun || isPending}
              className="rounded-md px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              {isPending ? "Moving…" : canRun ? `Move ${count} student${count !== 1 ? "s" : ""}` : "Move students"}
            </button>
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            Tip: when promoting several years, start from the top (e.g. Year 4 → Graduated, then Year 3 → Year 4) so groups don&apos;t merge by mistake.
          </p>

          {message && (
            <p
              className="mt-3 flex items-start gap-2 rounded-md p-3 text-sm"
              style={message.tone === "ok" ? { background: "var(--success-soft)", color: "var(--success)" } : { background: "var(--danger-soft)", color: "var(--danger)" }}
            >
              {message.tone === "ok" ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
              {message.text}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
