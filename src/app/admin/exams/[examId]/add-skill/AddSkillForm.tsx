"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import type { SkillOption } from "@/lib/supabase/exams";
import { addSkillToExamAction, type AddSkillToExamState } from "./actions";

export function AddSkillForm({
  examId,
  skills,
  defaultRole,
  hasCompulsory,
  poolMarks,
  usedPaperNumbers,
  justAdded,
}: {
  examId: string;
  skills: SkillOption[]; // already filtered to skills not yet on this exam
  defaultRole: "compulsory" | "drawn";
  hasCompulsory: boolean;
  poolMarks: number | null; // marks every drawn skill must share, if the pool already has one
  usedPaperNumbers: number[];
  justAdded: boolean;
}) {
  const boundAction = addSkillToExamAction.bind(null, examId);
  const [state, formAction, isPending] = useActionState<AddSkillToExamState, FormData>(boundAction, { error: null });
  const [role, setRole] = useState<"compulsory" | "drawn">(hasCompulsory ? "drawn" : defaultRole);
  const [skillId, setSkillId] = useState("");
  const [query, setQuery] = useState("");
  const [paperNumber, setPaperNumber] = useState("");

  const selected = skills.find((s) => s.id === skillId);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? skills.filter((s) => s.name.toLowerCase().includes(q) || String(s.skillNumber) === q) : skills;
  }, [skills, query]);

  const marksLocked = role === "drawn" && poolMarks !== null;
  const suggestedPaper = selected ? String(selected.skillNumber) : "";
  const effectivePaper = paperNumber || suggestedPaper;
  const paperClash = role === "drawn" && effectivePaper !== "" && usedPaperNumbers.includes(Number(effectivePaper));

  return (
    <form action={formAction} className="max-w-2xl space-y-5 rounded-lg border border-border bg-surface p-4 sm:p-6">
      {justAdded && !state.error && (
        <p className="flex items-start gap-2 rounded-md p-3 text-sm" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> Skill added to the draw pool. Add the next one.
        </p>
      )}
      {state.error && (
        <p className="flex items-start gap-2 rounded-md p-3 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {state.error}
        </p>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">Role in this exam</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(["compulsory", "drawn"] as const).map((r) => {
            const disabled = r === "compulsory" && hasCompulsory;
            return (
              <label
                key={r}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                style={role === r ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : { borderColor: "var(--border)" }}
              >
                <input type="radio" name="role" value={r} checked={role === r} disabled={disabled} onChange={() => setRole(r)} className="mt-1" />
                <span>
                  <span className="block text-sm font-medium text-ink">{r === "compulsory" ? "Compulsory" : "Draw pool"}</span>
                  <span className="block text-xs text-ink-muted">
                    {r === "compulsory"
                      ? disabled
                        ? "This exam already has its compulsory skill."
                        : "Every student is assessed on it."
                      : "Students pick its paper number from the floor."}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="skill-search" className="mb-1.5 block text-sm font-medium text-ink">Skill</label>
        <input
          id="skill-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or library number…"
          className="mb-2 w-full rounded-md border border-border bg-bg px-3 py-2.5 text-base text-ink placeholder:text-ink-faint sm:text-sm"
        />
        <input type="hidden" name="skillId" value={skillId} />
        {skills.length === 0 ? (
          <p className="text-sm text-ink-faint">
            Every skill in the library is already on this exam. <Link href="/admin/skills/new" className="font-medium text-accent-ink hover:underline">Create a skill</Link>
          </p>
        ) : (
          <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border" role="listbox" aria-label="Skills">
            {filtered.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={s.id === skillId}
                  onClick={() => {
                    setSkillId(s.id);
                    setPaperNumber("");
                  }}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm"
                  style={s.id === skillId ? { background: "var(--accent-soft)" } : {}}
                >
                  <span className="w-10 shrink-0 text-xs font-semibold tabular text-ink-faint">#{s.skillNumber}</span>
                  <span className="min-w-0 flex-1 text-ink">{s.name}</span>
                  <span className="shrink-0 text-xs tabular text-ink-faint">rubric / {s.nativeTotal}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-faint">No skill matches.</li>}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="assignedMarks" className="mb-1.5 block text-sm font-medium text-ink">Allowed marks in this exam</label>
          {marksLocked ? (
            <>
              <input type="hidden" name="assignedMarks" value={poolMarks ?? ""} />
              <p className="flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2.5 text-sm tabular text-ink">
                <Lock size={13} className="text-ink-faint" /> {poolMarks}
              </p>
              <p className="mt-1 text-xs text-ink-faint">All drawn skills share the same marks. Change them from any drawn skill&apos;s Edit page.</p>
            </>
          ) : (
            <>
              <input
                id="assignedMarks"
                name="assignedMarks"
                type="number"
                inputMode="decimal"
                min={0.5}
                step={0.5}
                required
                placeholder="e.g. 20"
                className="w-32 rounded-md border border-border bg-bg px-3 py-2.5 text-base tabular text-ink placeholder:text-ink-faint sm:text-sm"
              />
              <p className="mt-1 text-xs text-ink-faint">
                {selected ? `Rubric scores (out of ${selected.nativeTotal}) scale proportionally to this.` : "Rubric scores scale proportionally to this."}
              </p>
            </>
          )}
        </div>

        {role === "drawn" && (
          <div>
            <label htmlFor="paperNumber" className="mb-1.5 block text-sm font-medium text-ink">Paper number</label>
            <input
              id="paperNumber"
              name="paperNumber"
              type="number"
              inputMode="numeric"
              min={1}
              value={effectivePaper}
              onChange={(e) => setPaperNumber(e.target.value)}
              placeholder="Pick a skill"
              className="w-28 rounded-md border bg-bg px-3 py-2.5 text-base tabular text-ink sm:text-sm"
              style={{ borderColor: paperClash ? "var(--danger)" : "var(--border)" }}
            />
            <p className="mt-1 text-xs" style={{ color: paperClash ? "var(--danger)" : "var(--ink-faint)" }}>
              {paperClash ? "Another skill in this exam already uses this number." : "Defaults to the skill's library number — the number written on the floor paper."}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-5 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={isPending || !skillId || paperClash}
          className="rounded-md px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? "Adding…" : "Add skill"}
        </button>
        {role === "drawn" && (
          <button
            type="submit"
            name="addAnother"
            value="1"
            disabled={isPending || !skillId || paperClash}
            className="rounded-md border border-border px-4 py-2.5 text-sm font-medium text-ink hover:bg-bg disabled:opacity-50"
          >
            Add and add another
          </button>
        )}
        <Link href={`/admin/exams/${examId}`} className="rounded-md px-4 py-2.5 text-center text-sm font-medium text-ink-muted hover:text-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}
