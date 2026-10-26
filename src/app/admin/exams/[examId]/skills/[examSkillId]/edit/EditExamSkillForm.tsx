"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { ExamSkillForEdit, CsaOption } from "@/lib/supabase/exams";
import { editExamSkillAction, type EditExamSkillState } from "./actions";

export function EditExamSkillForm({ data, csas }: { data: ExamSkillForEdit; csas: CsaOption[] }) {
  const boundAction = editExamSkillAction.bind(null, data.examId, data.examSkillId);
  const [state, formAction, isPending] = useActionState<EditExamSkillState, FormData>(boundAction, { error: null });

  return (
    <form action={formAction} className="max-w-xl space-y-5 rounded-lg border border-border bg-surface p-4 sm:p-6">
      {state.error && (
        <div
          className="flex items-start gap-2 rounded-md p-3 text-sm"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div>
        <label htmlFor="assignedMarks" className="mb-1.5 block text-sm font-medium text-ink">
          Assigned marks for this exam
        </label>
        <input
          id="assignedMarks"
          name="assignedMarks"
          type="number"
          min={1}
          defaultValue={data.assignedMarks}
          className="w-32 rounded-md border border-border bg-bg px-3 py-2 text-sm tabular text-ink"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="isCompulsory" defaultChecked={data.isCompulsory} />
        Compulsory skill for this exam
      </label>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">Assigned CSA(s)</p>
        {csas.length === 0 ? (
          <p className="text-xs text-ink-faint">No CSA accounts yet.</p>
        ) : (
          <div className="space-y-1.5">
            {csas.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" name="csaIds" value={c.id} defaultChecked={data.currentCsaIds.includes(c.id)} />
                {c.fullName}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border pt-5">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
        <Link href={`/admin/exams/${data.examId}`} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-bg">
          Cancel
        </Link>
      </div>
    </form>
  );
}
