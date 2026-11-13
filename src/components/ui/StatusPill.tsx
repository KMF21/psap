import type { AssessmentStatus } from "@/lib/types";

export const statusStyles: Record<AssessmentStatus, { bg: string; fg: string; label: string }> = {
  pending: { bg: "var(--neutral-soft)", fg: "var(--ink-muted)", label: "Pending" },
  draft: { bg: "var(--warn-soft)", fg: "var(--warn)", label: "Draft" },
  submitted: { bg: "var(--success-soft)", fg: "var(--success)", label: "Submitted" },
  amended: { bg: "var(--accent-soft)", fg: "var(--accent-ink)", label: "Amended" },
};

export function StatusPill({ status }: { status: AssessmentStatus }) {
  const s = statusStyles[status];
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}
