"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { claimSkillAction } from "@/app/csa/actions";

export function StartButton({
  examId,
  studentId,
  examSkillId,
  disabled,
  skillName,
  backHref,
}: {
  examId: string;
  studentId: string;
  examSkillId: string;
  disabled: boolean;
  skillName: string;
  backHref: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <p className="text-sm text-ink">Start scoring <strong>{skillName}</strong> for this student?</p>
      {error && <p className="rounded-md p-3 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p>}
      <button
        disabled={disabled || isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await claimSkillAction(examId, studentId, examSkillId);
            if (result.error) setError(result.error);
            else router.refresh();
          })
        }
        className="w-full rounded-md px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        style={{ background: "var(--accent)" }}
      >
        {disabled ? "Exam is not open" : isPending ? "Starting…" : "Start scoring"}
      </button>
      <Link href={backHref} className="block text-center text-sm font-medium text-ink-muted">Cancel</Link>
    </div>
  );
}
