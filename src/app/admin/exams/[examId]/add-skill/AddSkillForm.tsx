"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { SkillOption, CsaOption } from "@/lib/supabase/exams";
import { addSkillToExamAction, type AddSkillToExamState } from "./actions";

export function AddSkillForm({ examId, skills, csas }: { examId: string; skills: SkillOption[]; csas: CsaOption[] }) {
  const boundAction = addSkillToExamAction.bind(null, examId);
  const [state, formAction, isPending] = useActionState<AddSkillToExamState, FormData>(boundAction, { error: null });

  return (
    <form action={formAction} className="max-w-xl space-y-5 rounded-lg border border-border bg-surface p-6">
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
        <label htmlFor="skillId" className="mb-1.5 block text-sm font-medium text-ink">
          Skill
        </label>
        <select id="skillId" name="skillId" required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink">
          <option value="">Select a skill…</option>
          {skills.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} (native total: {s.nativeTotal})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="assignedMarks" className="mb-1.5 block text-sm font-medium text-ink">
          Assigned marks for this exam
        </label>
        <input
          id="assignedMarks"
          name="assignedMarks"
          type="number"
          min={1}
          placeholder="e.g. 20"
          className="w-32 rounded-md border border-border bg-bg px-3 py-2 text-sm tabular text-ink placeholder:text-ink-faint"
        />
        <p className="mt-1 text-xs text-ink-faint">
          Scores are scaled proportionally from the skill&apos;s native rubric total to this value.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="isCompulsory" />
        Compulsory skill for this exam
      </label>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">Assign CSA(s)</p>
        {csas.length === 0 ? (
          <p className="text-xs text-ink-faint">No CSA accounts yet.</p>
        ) : (
          <div className="space-y-1.5">
            {csas.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" name="csaIds" value={c.id} />
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
          {isPending ? "Adding…" : "Add skill to exam"}
        </button>
        <Link href={`/admin/exams/${examId}`} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-bg">
          Cancel
        </Link>
      </div>
    </form>
  );
}
