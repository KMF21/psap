"use client";

import { useMemo, useState } from "react";
import { Search, Check, Save } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { scaleScore } from "@/lib/types";
import type { Skill, Student, ExamSkill } from "@/lib/types";

export function ScoringClient({
  examSkill,
  skill,
  students,
}: {
  examSkill: ExamSkill;
  skill: Skill;
  students: Student[];
}) {
  const [selectedId, setSelectedId] = useState(students[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});

  const filtered = useMemo(
    () =>
      students.filter(
        (s) =>
          s.fullName.toLowerCase().includes(query.toLowerCase()) ||
          s.registrationNumber.toLowerCase().includes(query.toLowerCase())
      ),
    [students, query]
  );

  const selected = students.find((s) => s.id === selectedId);
  const rawScore = skill.steps.reduce((sum, step) => sum + (scores[step.id] ?? 0), 0);
  const scaled = scaleScore(rawScore, skill.nativeTotal, examSkill.assignedMarks);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Student list */}
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
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => setSelectedId(s.id)}
                className="flex w-full items-center justify-between border-b border-border px-4 py-3 text-left last:border-0"
                style={s.id === selectedId ? { background: "var(--accent-soft)" } : {}}
              >
                <div>
                  <p className="text-sm font-medium text-ink">{s.fullName}</p>
                  <p className="text-xs tabular text-ink-faint">{s.registrationNumber}</p>
                </div>
                {s.id === selectedId && <Check size={15} style={{ color: "var(--accent-ink)" }} />}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Scoring form */}
      <div className="rounded-lg border border-border bg-surface lg:col-span-2">
        {selected ? (
          <>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-ink">{selected.fullName}</p>
                <p className="text-xs tabular text-ink-faint">{selected.registrationNumber} · {selected.level}</p>
              </div>
              <StatusPill status="draft" />
            </div>

            <div className="divide-y divide-border">
              {skill.steps.map((step) => (
                <div key={step.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{step.description}</p>
                    <p className="text-xs text-ink-faint">Max {step.maxMarks} marks</p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={step.maxMarks}
                    value={scores[step.id] ?? ""}
                    onChange={(e) =>
                      setScores((prev) => ({
                        ...prev,
                        [step.id]: Math.min(Number(e.target.value) || 0, step.maxMarks),
                      }))
                    }
                    className="w-20 shrink-0 rounded-md border border-border bg-bg px-3 py-1.5 text-right text-sm tabular text-ink"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-border bg-bg/50 px-5 py-4">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-ink-faint">Raw score</p>
                  <p className="text-lg font-semibold tabular text-ink">{rawScore} / {skill.nativeTotal}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-faint">Scaled to exam ({examSkill.assignedMarks} marks)</p>
                  <p className="text-lg font-semibold tabular" style={{ color: "var(--accent-ink)" }}>{scaled}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface">
                  Save as draft
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white"
                  style={{ background: "var(--accent)" }}
                >
                  <Save size={14} /> Submit assessment
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-sm text-ink-muted">Select a student to begin scoring.</div>
        )}
      </div>
    </div>
  );
}
