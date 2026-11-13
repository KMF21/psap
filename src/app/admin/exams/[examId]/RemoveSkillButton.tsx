"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { removeExamSkillAction } from "./actions";

export function RemoveSkillButton({
  examId,
  examSkillId,
  skillName,
  scoreCount,
}: {
  examId: string;
  examSkillId: string;
  skillName: string;
  scoreCount: number;
}) {
  const [isPending, startTransition] = useTransition();

  function remove() {
    const warning =
      scoreCount > 0
        ? `Remove "${skillName}" from this exam?\n\n${scoreCount} score${scoreCount > 1 ? "s" : ""} recorded against it will be DELETED. This is kept in the audit log but cannot be undone.`
        : `Remove "${skillName}" from this exam?`;
    if (!window.confirm(warning)) return;
    startTransition(async () => {
      const result = await removeExamSkillAction(examId, examSkillId);
      if (result.error) window.alert(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={isPending}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-ink-muted hover:bg-bg hover:text-danger disabled:opacity-50"
      aria-label={`Remove ${skillName} from this exam`}
    >
      <Trash2 size={13} /> {isPending ? "Removing…" : "Remove"}
    </button>
  );
}
