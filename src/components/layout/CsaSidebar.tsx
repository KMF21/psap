"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardCheck, FolderCheck, LogOut } from "lucide-react";
import { csas } from "@/lib/mock-data";

const items = [
  { href: "/csa", label: "Dashboard", icon: LayoutDashboard },
  { href: "/csa/scoring", label: "Practical scoring", icon: ClipboardCheck },
  { href: "/csa/project", label: "Project assessment", icon: FolderCheck },
];

export function CsaSidebar() {
  const pathname = usePathname();
  const me = csas[0]; // mock signed-in CSA

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold text-white" style={{ background: "var(--accent)" }}>
          P
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-ink">PSAP</p>
          <p className="text-xs leading-tight text-ink-faint">CSA workspace</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm"
                  style={active ? { background: "var(--accent-soft)", color: "var(--accent-ink)", fontWeight: 600 } : { color: "var(--ink-muted)" }}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-2.5 border-t border-border px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-soft text-xs font-semibold text-ink">
          {me.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{me.fullName}</p>
          <p className="truncate text-xs text-ink-faint">Clinical Skills Assessor</p>
        </div>
        <LogOut size={16} className="text-ink-faint" />
      </div>
    </aside>
  );
}
