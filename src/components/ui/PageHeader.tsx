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
        <div className="mb-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ink-faint">
          {breadcrumb.map((b, i) => (
            <span key={b.label} className="flex min-w-0 items-center gap-1.5">
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-11 sm:w-11"
            style={{ background: "var(--ink)" }}
          >
            <Icon size={20} className="text-white" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-lg font-semibold text-ink sm:text-xl">{title}</h1>
            {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="sm:shrink-0">{action}</div>}
      </div>
    </div>
  );
}
