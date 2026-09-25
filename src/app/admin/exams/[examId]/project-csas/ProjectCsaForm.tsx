"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { CsaOption } from "@/lib/supabase/exams";
import { setProjectCsasAction, type ProjectCsaState } from "./actions";

export function ProjectCsaForm({
  examId,
  csas,
  currentlyAssignedNames,
  projectMaxTotal,
}: {
  examId: string;
  csas: CsaOption[];
  currentlyAssignedNames: string[];
  projectMaxTotal: number;
}) {
  const boundAction = setProjectCsasAction.bind(null, examId);
  const [state, formAction, isPending] = useActionState<ProjectCsaState, FormData>(boundAction, { error: null });

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

      {currentlyAssignedNames.length > 0 && (
        <div className="rounded-md bg-neutral-soft p-3 text-xs text-ink-muted">
          Currently assigned: {currentlyAssignedNames.join(", ")}. Saving below replaces this list.
        </div>
      )}

      <div>
        <label htmlFor="maxMarksPerCsa" className="mb-1.5 block text-sm font-medium text-ink">
          Max marks per CSA
        </label>
        <input
          id="maxMarksPerCsa"
          name="maxMarksPerCsa"
          type="number"
          min={1}
          defaultValue={Math.round(projectMaxTotal / 2) || 10}
          className="w-32 rounded-md border border-border bg-bg px-3 py-2 text-sm tabular text-ink"
        />
        <p className="mt-1 text-xs text-ink-faint">
          Each assigned CSA scores independently out of this value. The project total is the sum of their scores
          (exam target: {projectMaxTotal}).
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">Assign CSA(s)</p>
        {csas.length === 0 ? (
          <p className="text-xs text-ink-faint">No CSA accounts yet.</p>
        ) : (
          <div className="space-y-1.5">
            {csas.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" name="csaIds" value={c.id} defaultChecked={currentlyAssignedNames.includes(c.fullName)} />
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
          {isPending ? "Saving…" : "Save project CSAs"}
        </button>
        <Link href={`/admin/exams/${examId}`} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-bg">
          Cancel
        </Link>
      </div>
    </form>
  );
}
