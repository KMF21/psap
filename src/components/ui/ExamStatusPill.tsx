const styles = {
  draft: { bg: "var(--warn-soft)", fg: "var(--warn)", label: "Draft" },
  open: { bg: "var(--success-soft)", fg: "var(--success)", label: "Open" },
  closed: { bg: "var(--neutral-soft)", fg: "var(--ink-muted)", label: "Closed" },
} as const;

export function ExamStatusPill({ status }: { status: "draft" | "open" | "closed" }) {
  const s = styles[status];
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}
