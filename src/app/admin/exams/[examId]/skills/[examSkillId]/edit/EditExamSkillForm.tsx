"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import type { ExamSkillForEdit } from "@/lib/supabase/exams";
import { editExamSkillAction, type EditExamSkillState } from "./actions";

export function EditExamSkillForm({ examSkill }: { examSkill: ExamSkillForEdit }) {
  const boundAction = editExamSkillAction.bind(null, examSkill.examId, examSkill.id);
  const [state, formAction, isPending] = useActionState<EditExamSkillState, FormData>(boundAction, { error: null });
  const [marks, setMarks] = useState(String(examSkill.assignedMarks));

  const marksChanged = Number(marks) !== examSkill.assignedMarks && Number(marks) > 0;
  const poolWide = !examSkill.isCompulsory && examSkill.poolSize > 1;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (marksChanged && examSkill.scoreCount > 0) {
          const ok = window.confirm(
            `Change allowed marks from ${examSkill.assignedMarks} to ${marks}?\n\nAll stored scores${poolWide ? " for every drawn skill in this exam" : ""} will be recalculated proportionally, and the change is recorded in the audit log.`,
          );
          if (!ok) e.preventDefault();
        }
      }}
      className="max-w-xl space-y-5 rounded-lg border border-border bg-surface p-4 sm:p-6"
    >
      {state.error && (
        <p className="flex items-start gap-2 rounded-md p-3 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {state.error}
        </p>
      )}

      <div className="rounded-md bg-bg p-3 text-sm">
        <p className="font-medium text-ink">{examSkill.skillName}</p>
        <p className="text-xs text-ink-muted">
          {examSkill.isCompulsory ? "Compulsory skill" : "Draw pool"} · library #{examSkill.skillNumber} · rubric / {examSkill.nativeTotal} ·{" "}
          {examSkill.scoreCount} scored
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="assignedMarks" className="mb-1.5 block text-sm font-medium text-ink">Allowed marks</label>
          <input
            id="assignedMarks"
            name="assignedMarks"
            type="number"
            inputMode="decimal"
            min={0.5}
            step={0.5}
            required
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
            className="w-32 rounded-md border border-border bg-bg px-3 py-2.5 text-base tabular text-ink sm:text-sm"
          />
        </div>
        {!examSkill.isCompulsory && (
          <div>
            <label htmlFor="paperNumber" className="mb-1.5 block text-sm font-medium text-ink">Paper number</label>
            <input
              id="paperNumber"
              name="paperNumber"
              type="number"
              inputMode="numeric"
              min={1}
              defaultValue={examSkill.paperNumber ?? ""}
              className="w-28 rounded-md border border-border bg-bg px-3 py-2.5 text-base tabular text-ink sm:text-sm"
            />
          </div>
        )}
      </div>

      {marksChanged && (poolWide || examSkill.scoreCount > 0) && (
        <p className="flex items-start gap-2 rounded-md p-3 text-xs" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
          <RefreshCw size={13} className="mt-0.5 shrink-0" />
          <span>
            {poolWide && <>This applies to <strong>all {examSkill.poolSize} drawn skills</strong>, which must share the same marks. </>}
            {examSkill.scoreCount > 0 && <>Existing scores will be recalculated and the change audited.</>}
          </span>
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-5 sm:flex-row">
        <button type="submit" disabled={isPending} className="rounded-md px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60" style={{ background: "var(--accent)" }}>
          {isPending ? "Saving…" : "Save changes"}
        </button>
        <Link href={`/admin/exams/${examSkill.examId}`} className="rounded-md border border-border px-4 py-2.5 text-center text-sm font-medium text-ink hover:bg-bg">
          Cancel
        </Link>
      </div>
    </form>
  );
}
