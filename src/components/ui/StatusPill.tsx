import { statusStyles } from "@/lib/mock-data";
import type { AssessmentStatus } from "@/lib/types";

export function StatusPill({ status }: { status: AssessmentStatus }) {
  const s = statusStyles[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}
