"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import {
  LayoutDashboard, Users, ClipboardList, ListChecks, UserCog,
  FileBarChart, LogOut, Menu, X, History,
} from "lucide-react";

const groups = [
  {
    label: "Assessment",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/exams", label: "Examinations", icon: ClipboardList },
      { href: "/admin/skills", label: "Skills & rubrics", icon: ListChecks },
      { href: "/admin/results", label: "Results", icon: FileBarChart },
      { href: "/admin/audit-log", label: "Audit log", icon: History },
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
  const { user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Admin";
  const initials = displayName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
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
        <button
          onClick={() => setMobileOpen(false)}
          className="rounded-md p-1.5 text-ink-faint hover:bg-bg lg:hidden"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
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
                      onClick={() => setMobileOpen(false)}
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
      </nav>

      <div className="flex items-center gap-2.5 border-t border-border px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-soft text-xs font-semibold text-ink">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{displayName}</p>
          <p className="truncate text-xs text-ink-faint">Admin</p>
        </div>
        <SignOutButton>
          <button aria-label="Sign out" className="text-ink-faint hover:text-ink">
            <LogOut size={16} />
          </button>
        </SignOutButton>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar — visible only below lg, fixed so it stays put while content scrolls */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4 lg:hidden">
        <button onClick={() => setMobileOpen(true)} className="rounded-md p-1.5 text-ink hover:bg-bg" aria-label="Open menu">
          <Menu size={20} />
        </button>
        <div className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-white" style={{ background: "var(--accent)" }}>
          P
        </div>
        <p className="text-sm font-semibold text-ink">PSAP</p>
      </div>

      {/* Backdrop — closes the drawer on tap outside, mobile only */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* The sidebar itself: off-canvas drawer on mobile, static in-flow on desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-surface transition-transform duration-200 ease-out lg:static lg:z-auto lg:h-screen lg:w-64 lg:shrink-0 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
