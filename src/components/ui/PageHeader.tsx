import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  breadcrumb,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  breadcrumb?: { label: string; href?: string }[];
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {breadcrumb && (
        <div className="mb-3 flex items-center gap-1.5 text-sm text-ink-faint">
          {breadcrumb.map((b, i) => (
            <span key={b.label} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={13} />}
              {b.href ? (
                <Link href={b.href} className="hover:text-accent-ink">
                  {b.label}
                </Link>
              ) : (
                <span className="text-ink">{b.label}</span>
              )}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-lg"
            style={{ background: "var(--ink)" }}
          >
            <Icon size={20} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">{title}</h1>
            {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}
