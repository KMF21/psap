"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Search, AlertTriangle, Copy, UserMinus } from "lucide-react";
import type { StudentEligibilityRow } from "@/lib/supabase/exams";
import { saveEligibilityAction, getEligibleIdsAction, removeStudentAction, type EligibilityState } from "./actions";

export function EligibilityForm({
  examId,
  students,
  otherExams,
}: {
  examId: string;
  students: StudentEligibilityRow[];
  otherExams: { id: string; label: string }[];
}) {
  const boundAction = saveEligibilityAction.bind(null, examId);
  const [state, formAction, isPending] = useActionState<EligibilityState, FormData>(boundAction, { error: null });

  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [onlyRoster, setOnlyRoster] = useState(students.some((s) => s.isEligible));
  const [rows, setRows] = useState(students);
  const [removing, startRemove] = useTransition();
  const [rowError, setRowError] = useState<string | null>(null);
  const [sourceExam, setSourceExam] = useState("");
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const [copying, startCopy] = useTransition();
  const levels = useMemo(() => [...new Set(students.map((s) => s.level).filter(Boolean))].sort(), [students]);
  const [selected, setSelected] = useState<Set<string>>(new Set(students.filter((s) => s.isEligible).map((s) => s.id)));

  const filtered = useMemo(
    () =>
      rows.filter(
        (s) =>
          (!onlyRoster || s.isEligible || selected.has(s.id)) &&
          (!level || s.level === level) &&
          (s.fullName.toLowerCase().includes(query.toLowerCase()) ||
            s.registrationNumber.toLowerCase().includes(query.toLowerCase())),
      ),
    [rows, query, level, onlyRoster, selected],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function removeNow(s: StudentEligibilityRow) {
    const warning =
      s.scoreCount > 0
        ? `Remove ${s.fullName} from this exam?\n\nTheir ${s.scoreCount} score${s.scoreCount > 1 ? "s" : ""} in this exam will be DELETED. This is recorded in the audit log but cannot be undone.`
        : `Remove ${s.fullName} from this exam?`;
    if (!window.confirm(warning)) return;
    setRowError(null);
    startRemove(async () => {
      const result = await removeStudentAction(examId, s.id);
      if (result.error) {
        setRowError(result.error);
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === s.id ? { ...r, isEligible: false, scoreCount: 0 } : r)));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(s.id);
        return next;
      });
    });
  }

  function copyFromExam() {
    if (!sourceExam) return;
    setCopyNote(null);
    startCopy(async () => {
      const { ids, error } = await getEligibleIdsAction(sourceExam);
      if (error) {
        setCopyNote(`Couldn't copy: ${error}`);
        return;
      }
      const known = new Set(students.map((s) => s.id));
      const usable = ids.filter((id) => known.has(id));
      setSelected((prev) => new Set([...prev, ...usable]));
      setCopyNote(`Added ${usable.length} student${usable.length === 1 ? "" : "s"} from that examination. Review, then save.`);
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
    <form
      action={formAction}
      onSubmit={(e) => {
        const dropped = rows.filter((r) => r.isEligible && !selected.has(r.id));
        const scored = dropped.filter((r) => r.scoreCount > 0);
        if (dropped.length === 0) return;
        const msg =
          `${dropped.length} student${dropped.length > 1 ? "s" : ""} will be removed from this exam.` +
          (scored.length > 0
            ? `\n\n${scored.length} of them already ha${scored.length > 1 ? "ve" : "s"} scores, which will be DELETED (recorded in the audit log):\n` +
              scored.slice(0, 8).map((r) => `• ${r.fullName}`).join("\n") +
              (scored.length > 8 ? `\n…and ${scored.length - 8} more` : "")
            : "");
        if (!window.confirm(msg)) e.preventDefault();
      }}
      className="rounded-lg border border-border bg-surface"
    >
      {(state.error || rowError) && (
        <div
          className="flex items-start gap-2 border-b border-border p-4 text-sm"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{state.error ?? rowError}</span>
        </div>
      )}

      {/* Every selected student is submitted from here, so a search or level
          filter that hides rows can never silently drop someone's selection. */}
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="studentIds" value={id} />
      ))}

      {otherExams.length > 0 && (
        <div className="space-y-2 border-b border-border p-4">
          <p className="text-xs font-medium text-ink-muted">Start from an earlier examination</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={sourceExam}
              onChange={(e) => setSourceExam(e.target.value)}
              aria-label="Copy eligible students from another examination"
              className="w-full rounded-md border border-border bg-bg px-3 py-2.5 text-sm text-ink sm:max-w-sm sm:py-2"
            >
              <option value="">Choose an examination…</option>
              {otherExams.map((e) => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={copyFromExam}
              disabled={!sourceExam || copying}
              className="flex items-center justify-center gap-1.5 rounded-md border border-border px-3.5 py-2.5 text-sm font-medium text-ink hover:bg-bg disabled:opacity-50 sm:py-2"
            >
              <Copy size={14} /> {copying ? "Copying…" : "Add their students"}
            </button>
          </div>
          {copyNote && <p className="text-xs text-ink-muted">{copyNote}</p>}
        </div>
      )}

      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative w-full sm:w-64">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reg. number or name…"
              className="w-full rounded-md border border-border bg-bg py-2.5 pl-8 pr-3 text-sm text-ink placeholder:text-ink-faint sm:py-2"
            />
          </div>
          {levels.length > 1 && (
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              aria-label="Filter by level"
              className="w-full rounded-md border border-border bg-bg px-3 py-2.5 text-sm text-ink sm:w-auto sm:py-2"
            >
              <option value="">All levels</option>
              {levels.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            <input type="checkbox" checked={onlyRoster} onChange={(e) => setOnlyRoster(e.target.checked)} />
            Only students on this exam
          </label>
          <p className="text-xs text-ink-faint">{selected.size} of {students.length} selected</p>
          <button type="button" onClick={selectAllFiltered} className="text-xs font-medium text-accent-ink hover:underline">
            Select all shown
          </button>
          <button type="button" onClick={clearAllFiltered} className="text-xs font-medium text-ink-muted hover:underline">
            Clear shown
          </button>
        </div>
      </div>

      <ul className="max-h-[60vh] overflow-y-auto divide-y divide-border sm:max-h-[520px]">
        {filtered.length === 0 ? (
          <li className="px-5 py-8 text-center text-sm text-ink-faint">No students found.</li>
        ) : (
          filtered.map((s) => (
            <li key={s.id}>
              <label className="flex cursor-pointer items-center gap-3 px-4 py-3.5 hover:bg-bg/50 sm:px-5 sm:py-3">
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0"
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">{s.fullName}</p>
                  <p className="text-xs tabular text-ink-faint">
                    {s.registrationNumber} · {s.level}
                    {s.scoreCount > 0 && <span className="ml-1.5 font-medium" style={{ color: "var(--accent-ink)" }}>· {s.scoreCount} scored</span>}
                  </p>
                </div>
                {s.isEligible && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      removeNow(s);
                    }}
                    disabled={removing}
                    className="flex shrink-0 items-center gap-1 rounded-md px-2 py-2 text-xs font-medium text-ink-muted hover:bg-bg hover:text-danger disabled:opacity-50"
                    aria-label={`Remove ${s.fullName} from this exam`}
                  >
                    <UserMinus size={14} /> <span className="hidden sm:inline">Remove</span>
                  </button>
                )}
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
          {isPending ? "Saving…" : "Save roster"}
        </button>
        <Link href={`/admin/exams/${examId}`} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-bg">
          Cancel
        </Link>
      </div>
    </form>
  );
}
