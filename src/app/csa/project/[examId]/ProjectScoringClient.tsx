"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Check, Save, Lock, AlertTriangle } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import type { ProjectScoringData, ProjectScoringStudent } from "@/lib/supabase/scoring";
import { saveProjectScoreAction } from "./actions";

export function ProjectScoringClient({
  examData,
  initialStudents,
}: {
  examData: ProjectScoringData;
  initialStudents: ProjectScoringStudent[];
}) {
  const [students, setStudents] = useState(initialStudents);
  const [selectedId, setSelectedId] = useState(initialStudents[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [score, setScore] = useState<number>(initialStudents[0]?.score ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      students.filter(
        (s) =>
          s.fullName.toLowerCase().includes(query.toLowerCase()) ||
          s.registrationNumber.toLowerCase().includes(query.toLowerCase()),
      ),
    [students, query],
  );

  const selected = students.find((s) => s.id === selectedId);
  const isLocked = selected?.status === "submitted";

  function selectStudent(student: ProjectScoringStudent) {
    setSelectedId(student.id);
    setScore(student.score ?? 0);
    setError(null);
  }

  function handleSave(submit: boolean) {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await saveProjectScoreAction(examData.examId, selected.id, score, examData.maxMarks, submit);
      if (result.error) {
        setError(result.error);
        return;
      }
      setStudents((prev) => prev.map((s) => (s.id === selected.id ? { ...s, status: result.status ?? s.status, score } : s)));
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-lg border border-border bg-surface lg:col-span-1">
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reg. number or name…"
              className="w-full rounded-md border border-border bg-bg py-2 pl-8 pr-3 text-sm text-ink placeholder:text-ink-faint"
            />
          </div>
        </div>
        <ul className="max-h-[520px] overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-ink-faint">No eligible students found.</li>
          ) : (
            filtered.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => selectStudent(s)}
                  className="flex w-full items-center justify-between border-b border-border px-4 py-3 text-left last:border-0"
                  style={s.id === selectedId ? { background: "var(--accent-soft)" } : {}}
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{s.fullName}</p>
                    <p className="text-xs tabular text-ink-faint">{s.registrationNumber}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.status === "submitted" && <Lock size={12} className="text-ink-faint" />}
                    {s.id === selectedId && <Check size={15} style={{ color: "var(--accent-ink)" }} />}
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-lg border border-border bg-surface lg:col-span-2">
        {selected ? (
          <>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-ink">{selected.fullName}</p>
                <p className="text-xs tabular text-ink-faint">{selected.registrationNumber} · {selected.level}</p>
              </div>
              <StatusPill status={selected.status} />
            </div>

            {isLocked && (
              <div className="flex items-center gap-2 px-5 py-3 text-xs" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                <Lock size={13} />
                This project score is submitted and locked. An Admin must correct it directly.
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 px-5 py-3 text-xs" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="px-5 py-6">
              <label htmlFor="projectScore" className="mb-2 block text-sm font-medium text-ink">
                Project score
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="projectScore"
                  type="number"
                  min={0}
                  max={examData.maxMarks}
                  disabled={isLocked}
                  value={score}
                  onChange={(e) => setScore(Math.min(Math.max(Number(e.target.value) || 0, 0), examData.maxMarks))}
                  className="w-24 rounded-md border border-border bg-bg px-3 py-2 text-right text-lg font-semibold tabular text-ink disabled:opacity-50"
                />
                <span className="text-sm text-ink-faint">/ {examData.maxMarks}</span>
              </div>
              <p className="mt-2 text-xs text-ink-faint">
                This is your independent assessment of the project — another CSA may also score it separately; the
                two are summed for the final project total.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border bg-bg/50 px-5 py-4">
              <button
                onClick={() => handleSave(false)}
                disabled={isLocked || isPending}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface disabled:opacity-50"
              >
                {isPending ? "Saving…" : "Save as draft"}
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={isLocked || isPending}
                className="flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "var(--accent)" }}
              >
                <Save size={14} /> {isPending ? "Submitting…" : "Submit score"}
              </button>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-sm text-ink-muted">Select a student to begin scoring.</div>
        )}
      </div>
    </div>
  );
}
