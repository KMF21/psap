"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ListChecks, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { createSkillAction, type CreateSkillState } from "./actions";

interface StepRow {
  key: number;
  description: string;
  maxMarks: string;
}

let nextKey = 1;

export default function NewSkillPage() {
  const [state, formAction, isPending] = useActionState<CreateSkillState, FormData>(createSkillAction, { error: null });
  const [steps, setSteps] = useState<StepRow[]>([
    { key: nextKey++, description: "", maxMarks: "" },
    { key: nextKey++, description: "", maxMarks: "" },
  ]);

  const total = steps.reduce((sum, s) => sum + (Number(s.maxMarks) || 0), 0);

  function addStep() {
    setSteps((prev) => [...prev, { key: nextKey++, description: "", maxMarks: "" }]);
  }

  function removeStep(key: number) {
    setSteps((prev) => (prev.length > 1 ? prev.filter((s) => s.key !== key) : prev));
  }

  function updateStep(key: number, field: "description" | "maxMarks", value: string) {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, [field]: value } : s)));
  }

  return (
    <div>
      <PageHeader
        icon={ListChecks}
        title="Add skill"
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Skills & rubrics", href: "/admin/skills" },
          { label: "Add skill" },
        ]}
      />

      <form action={formAction} className="max-w-2xl space-y-5 rounded-lg border border-border bg-surface p-6">
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
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink">
            Skill name
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="e.g. Blood Pressure Estimation"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
          />
        </div>

        <div>
          <label htmlFor="timeAllowedMinutes" className="mb-1.5 block text-sm font-medium text-ink">
            Time allowed (minutes)
          </label>
          <input
            id="timeAllowedMinutes"
            name="timeAllowedMinutes"
            type="number"
            min={1}
            defaultValue={10}
            className="w-32 rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Rubric steps</p>
            <p className="text-xs text-ink-faint">
              Native total: <span className="font-semibold tabular text-ink">{total}</span> marks
            </p>
          </div>

          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={step.key} className="flex items-start gap-2">
                <span className="mt-2.5 w-5 shrink-0 text-xs text-ink-faint">{i + 1}.</span>
                <input
                  name="stepDescription"
                  value={step.description}
                  onChange={(e) => updateStep(step.key, "description", e.target.value)}
                  placeholder="Step description"
                  className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
                />
                <input
                  name="stepMaxMarks"
                  type="number"
                  min={1}
                  value={step.maxMarks}
                  onChange={(e) => updateStep(step.key, "maxMarks", e.target.value)}
                  placeholder="Marks"
                  className="w-20 shrink-0 rounded-md border border-border bg-bg px-3 py-2 text-right text-sm tabular text-ink placeholder:text-ink-faint"
                />
                <button
                  type="button"
                  onClick={() => removeStep(step.key)}
                  disabled={steps.length === 1}
                  className="mt-1.5 shrink-0 rounded-md p-1.5 text-ink-faint hover:bg-bg hover:text-danger disabled:opacity-30"
                  aria-label="Remove step"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addStep}
            className="mt-3 flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-bg"
          >
            <Plus size={13} /> Add step
          </button>
        </div>

        <div className="flex items-center gap-2 border-t border-border pt-5">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: "var(--accent)" }}
          >
            {isPending ? "Saving…" : "Save skill"}
          </button>
          <Link href="/admin/skills" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-bg">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
