"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Search, AlertTriangle } from "lucide-react";
import type { StudentEligibilityRow } from "@/lib/supabase/exams";
import { saveEligibilityAction, type EligibilityState } from "./actions";

export function EligibilityForm({ examId, students }: { examId: string; students: StudentEligibilityRow[] }) {
  const boundAction = saveEligibilityAction.bind(null, examId);
  const [state, formAction, isPending] = useActionState<EligibilityState, FormData>(boundAction, { error: null });

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(students.filter((s) => s.isEligible).map((s) => s.id)));

  const filtered = useMemo(
    () =>
      students.filter(
        (s) =>
          s.fullName.toLowerCase().includes(query.toLowerCase()) ||
          s.registrationNumber.toLowerCase().includes(query.toLowerCase()),
      ),
    [students, query],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((s) => next.add(s.id));
      return next;
    });
  }

  function clearAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((s) => next.delete(s.id));
      return next;
    });
  }

  return (
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

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reg. number or name…"
            className="w-64 rounded-md border border-border bg-bg py-2 pl-8 pr-3 text-sm text-ink placeholder:text-ink-faint"
          />
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-ink-faint">{selected.size} of {students.length} selected</p>
          <button type="button" onClick={selectAllFiltered} className="text-xs font-medium text-accent-ink hover:underline">
            Select all shown
          </button>
          <button type="button" onClick={clearAllFiltered} className="text-xs font-medium text-ink-muted hover:underline">
            Clear shown
          </button>
        </div>
      </div>

      <ul className="max-h-[520px] overflow-y-auto divide-y divide-border">
        {filtered.length === 0 ? (
          <li className="px-5 py-8 text-center text-sm text-ink-faint">No students found.</li>
        ) : (
          filtered.map((s) => (
            <li key={s.id}>
              <label className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-bg/50">
                <input
                  type="checkbox"
                  name="studentIds"
                  value={s.id}
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">{s.fullName}</p>
                  <p className="text-xs tabular text-ink-faint">{s.registrationNumber} · {s.level}</p>
                </div>
              </label>
            </li>
          ))
        )}
      </ul>

      <div className="flex items-center gap-2 border-t border-border p-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? "Saving…" : "Save eligibility"}
        </button>
        <Link href={`/admin/exams/${examId}`} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-bg">
          Cancel
        </Link>
      </div>
    </form>
  );
}
