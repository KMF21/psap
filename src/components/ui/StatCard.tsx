import { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  accent = "var(--accent)",
}: {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
  accent?: string;
}) {
  return (
    <div
      className="rounded-lg bg-surface p-5 border border-border"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-muted">{label}</p>
          <p className="mt-2 text-3xl font-semibold tabular text-ink">{value}</p>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-md"
          style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
        >
          <Icon size={18} strokeWidth={2} />
        </div>
      </div>
      {delta && <p className="mt-3 text-xs text-ink-faint">{delta}</p>}
    </div>
  );
}
