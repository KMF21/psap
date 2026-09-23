"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, ClipboardList, ListChecks, UserCog,
  FileBarChart, Settings, LogOut,
} from "lucide-react";
import { currentAdmin } from "@/lib/mock-data";

const groups = [
  {
    label: "Assessment",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/exams", label: "Examinations", icon: ClipboardList },
      { href: "/admin/skills", label: "Skills & rubrics", icon: ListChecks },
      { href: "/admin/results", label: "Results", icon: FileBarChart },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/students", label: "Students", icon: Users },
      { href: "/admin/csas", label: "CSA accounts", icon: UserCog },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-5 py-5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold text-white"
          style={{ background: "var(--accent)" }}
        >
          P
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-ink">PSAP</p>
          <p className="text-xs leading-tight text-ink-faint">Practical Skills Portal</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1.5 px-2 text-xs font-medium text-ink-faint">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors"
                      style={
                        active
                          ? { background: "var(--accent-soft)", color: "var(--accent-ink)", fontWeight: 600 }
                          : { color: "var(--ink-muted)" }
                      }
                    >
                      <Icon size={16} strokeWidth={2} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className="mb-5">
          <p className="mb-1.5 px-2 text-xs font-medium text-ink-faint">System</p>
          <Link
            href="/admin/settings"
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink-muted"
          >
            <Settings size={16} strokeWidth={2} />
            Settings
          </Link>
        </div>
      </nav>

      <div className="flex items-center gap-2.5 border-t border-border px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-soft text-xs font-semibold text-ink">
          {currentAdmin.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{currentAdmin.fullName}</p>
          <p className="truncate text-xs text-ink-faint">Admin</p>
        </div>
        <LogOut size={16} className="text-ink-faint" />
      </div>
    </aside>
  );
}
