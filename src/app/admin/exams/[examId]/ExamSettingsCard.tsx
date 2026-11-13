"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { updateExamSettingsAction } from "./actions";

export function ExamSettingsCard({
  examId,
  initial,
  compulsoryMarks,
  drawnMarks,
  projectMaxTotal,
  hasProjectScores,
}: {
  examId: string;
  initial: { title: string; drawsPerStudent: number; examType: "practical_only" | "practical_and_project" };
  compulsoryMarks: number | null;
  drawnMarks: number | null;
  projectMaxTotal: number;
  hasProjectScores: boolean;
}) {
  const [title, setTitle] = useState(initial.title);
  const [draws, setDraws] = useState(String(initial.drawsPerStudent));
  const [examType, setExamType] = useState(initial.examType);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const n = Number(draws);
  const practicalMax = (compulsoryMarks ?? 0) + (Number.isFinite(n) ? n : 0) * (drawnMarks ?? 0);
  const dirty = title !== initial.title || draws !== String(initial.drawsPerStudent) || examType !== initial.examType;

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateExamSettingsAction(examId, { title, drawsPerStudent: Number(draws), examType });
      setMessage(result.error ? { tone: "error", text: result.error } : { tone: "ok", text: "Settings saved." });
    });
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-ink">Exam settings</h2>
      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="exam-title" className="mb-1.5 block text-sm font-medium text-ink">Title</label>
          <input
            id="exam-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2.5 text-base text-ink sm:text-sm"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="exam-draws" className="mb-1.5 block text-sm font-medium text-ink">Skills drawn per student</label>
            <input
              id="exam-draws"
              type="number"
              inputMode="numeric"
              min={0}
              max={20}
              value={draws}
              onChange={(e) => setDraws(e.target.value)}
              className="w-28 rounded-md border border-border bg-bg px-3 py-2.5 text-base tabular text-ink sm:text-sm"
            />
            <p className="mt-1 text-xs text-ink-faint">In addition to the compulsory skill.</p>
          </div>
          <div>
            <label htmlFor="exam-type" className="mb-1.5 block text-sm font-medium text-ink">Components</label>
            <select
              id="exam-type"
              value={examType}
              onChange={(e) => setExamType(e.target.value as typeof examType)}
              disabled={hasProjectScores && examType === "practical_and_project"}
              className="w-full rounded-md border border-border bg-bg px-3 py-2.5 text-base text-ink disabled:opacity-60 sm:text-sm"
            >
              <option value="practical_only">Practical only</option>
              <option value="practical_and_project">Practical + project</option>
            </select>
          </div>
        </div>

        <dl className="space-y-1.5 rounded-md bg-bg p-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Practical maximum</dt>
            <dd className="text-right font-semibold tabular text-ink">
              {practicalMax}
              <span className="ml-1 text-xs font-normal text-ink-faint">
                = {compulsoryMarks ?? 0} compulsory + {Number.isFinite(n) ? n : 0} × {drawnMarks ?? 0}
              </span>
            </dd>
          </div>
          {examType === "practical_and_project" && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Project maximum</dt>
              <dd className="font-semibold tabular text-ink">{projectMaxTotal}</dd>
            </div>
          )}
        </dl>

        {message && (
          <p
            className="flex items-start gap-2 rounded-md p-3 text-sm"
            style={message.tone === "ok" ? { background: "var(--success-soft)", color: "var(--success)" } : { background: "var(--danger-soft)", color: "var(--danger)" }}
          >
            {message.tone === "ok" ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
            {message.text}
          </p>
        )}
        <button
          onClick={save}
          disabled={!dirty || isPending}
          className="w-full rounded-md px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 sm:w-auto"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </section>
  );
}
