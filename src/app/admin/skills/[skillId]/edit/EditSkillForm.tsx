"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Lock, Plus, Trash2 } from "lucide-react";
import type { Skill } from "@/lib/types";
import type { SkillUsage } from "@/lib/supabase/skills";
import { deleteSkillAction, updateSkillAction } from "./actions";

type Row = { key: string; id: string | null; description: string; maxMarks: string };

export function EditSkillForm({ skill, usage, examTitles }: { skill: Skill; usage: SkillUsage; examTitles: string[] }) {
  const locked = usage.scoreCount > 0;
  const [name, setName] = useState(skill.name);
  const [number, setNumber] = useState(String(skill.skillNumber));
  const [minutes, setMinutes] = useState(String(skill.timeAllowedMinutes));
  const [rows, setRows] = useState<Row[]>(skill.steps.map((s) => ({ key: s.id, id: s.id, description: s.description, maxMarks: String(s.maxMarks) })));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const total = Math.round(rows.reduce((s, r) => s + (Number(r.maxMarks) || 0), 0) * 10) / 10;

  function update(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateSkillAction(skill.id, {
        name,
        skillNumber: Number(number),
        timeAllowedMinutes: Number(minutes),
        steps: rows.map((r) => ({ id: r.id, description: r.description, maxMarks: Number(r.maxMarks) })),
      });
      if (result?.error) setError(result.error);
    });
  }

  function remove() {
    if (!window.confirm(`Delete "${skill.name}" (#${skill.skillNumber}) from the skill library? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteSkillAction(skill.id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="max-w-2xl space-y-4">
      {error && (
        <p className="flex items-start gap-2 rounded-md p-3 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}
      {locked && (
        <p className="flex items-start gap-2 rounded-md p-3 text-sm" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
          <Lock size={15} className="mt-0.5 shrink-0" />
          This skill already has {usage.scoreCount} score{usage.scoreCount !== 1 ? "s" : ""}, so its rubric marks and steps are locked to keep results fair.
          You can still correct the name, number, time and step wording.
        </p>
      )}

      <section className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_auto]">
          <div>
            <label htmlFor="skill-name" className="mb-1.5 block text-sm font-medium text-ink">Skill name</label>
            <input id="skill-name" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-border bg-bg px-3 py-2.5 text-base text-ink sm:text-sm" />
          </div>
          <div>
            <label htmlFor="skill-number" className="mb-1.5 block text-sm font-medium text-ink">Number</label>
            <input id="skill-number" type="number" inputMode="numeric" min={1} value={number} onChange={(e) => setNumber(e.target.value)} className="w-24 rounded-md border border-border bg-bg px-3 py-2.5 text-base tabular text-ink sm:text-sm" />
          </div>
          <div>
            <label htmlFor="skill-minutes" className="mb-1.5 block text-sm font-medium text-ink">Minutes</label>
            <input id="skill-minutes" type="number" inputMode="numeric" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-24 rounded-md border border-border bg-bg px-3 py-2.5 text-base tabular text-ink sm:text-sm" />
          </div>
        </div>
        <p className="-mt-2 text-xs text-ink-faint">The number is what students see on the floor paper; new exams use it as the paper number by default.</p>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-sm font-medium text-ink">Rubric steps</p>
            <p className="text-xs tabular text-ink-muted">Total {total}</p>
          </div>
          <ol className="space-y-2">
            {rows.map((r, i) => (
              <li key={r.key} className="flex items-start gap-2">
                <span className="mt-2.5 w-5 shrink-0 text-right text-xs tabular text-ink-faint">{i + 1}</span>
                <textarea
                  value={r.description}
                  onChange={(e) => update(r.key, { description: e.target.value })}
                  rows={2}
                  aria-label={`Step ${i + 1} description`}
                  className="min-w-0 flex-1 resize-y rounded-md border border-border bg-bg px-3 py-2 text-base text-ink sm:text-sm"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  min={0.5}
                  step={0.5}
                  value={r.maxMarks}
                  disabled={locked}
                  onChange={(e) => update(r.key, { maxMarks: e.target.value })}
                  aria-label={`Step ${i + 1} marks`}
                  className="w-20 shrink-0 rounded-md border border-border bg-bg px-2 py-2.5 text-right text-base tabular text-ink disabled:opacity-60 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                  disabled={locked || rows.length <= 1}
                  className="mt-1 shrink-0 rounded-md p-2 text-ink-faint hover:bg-bg hover:text-danger disabled:opacity-30"
                  aria-label={`Remove step ${i + 1}`}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, { key: `new-${Date.now()}`, id: null, description: "", maxMarks: "1" }])}
            disabled={locked}
            className="mt-2 flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-ink hover:bg-bg disabled:opacity-50"
          >
            <Plus size={14} /> Add step
          </button>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
          <button onClick={save} disabled={isPending} className="rounded-md px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60" style={{ background: "var(--accent)" }}>
            {isPending ? "Saving…" : "Save skill"}
          </button>
          <Link href="/admin/skills" className="rounded-md border border-border px-4 py-2.5 text-center text-sm font-medium text-ink hover:bg-bg">Cancel</Link>
        </div>
      </section>

      <section className="rounded-lg border p-4 sm:p-5" style={{ borderColor: "var(--danger-soft)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--danger)" }}>Delete skill</h2>
        {usage.examCount > 0 ? (
          <p className="mt-1 text-xs text-ink-muted">
            Used in {examTitles.join(", ")}. Remove it from {usage.examCount === 1 ? "that exam" : "those exams"} first (exam page → Remove), then it can be deleted here.
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-ink-muted">Not used in any exam, so it can be deleted.</p>
            <button onClick={remove} disabled={isPending} className="mt-3 rounded-md border px-4 py-2.5 text-sm font-medium disabled:opacity-50" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>
              Delete skill
            </button>
          </>
        )}
      </section>
    </div>
  );
}
