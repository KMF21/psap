"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export interface FilterSelect {
  param: string;
  label: string; // shown as the "all" option, e.g. "All sessions"
  options: { value: string; label: string }[];
}

/**
 * URL-driven filters: every control writes to the query string, and the
 * server page re-reads it. That keeps filtered views linkable/refreshable and
 * means the server does the filtering — no client-side copy of the data.
 * Stacks vertically on phones, sits in one row from sm: up.
 */
export function FilterBar({
  searchPlaceholder,
  selects = [],
  rightSlot,
  resultNote,
}: {
  searchPlaceholder?: string;
  selects?: FilterSelect[];
  rightSlot?: React.ReactNode;
  resultNote?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const urlQ = params.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the box in sync when the URL changes from outside (Clear filters,
  // back button) — but not while the user is typing and the URL is catching up.
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ);
    if (urlQ.trim() !== q.trim()) setQ(urlQ);
  }

  function push(next: URLSearchParams) {
    next.delete("page"); // any filter change returns to page 1
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function setParam(name: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    push(next);
  }

  function onSearch(value: string) {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setParam("q", value.trim()), 300);
  }

  const active = Boolean(params.get("q")) || selects.some((s) => params.get(s.param));

  return (
    <div className="space-y-2 border-b border-border px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {searchPlaceholder && (
          <div className="relative w-full sm:w-64">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="search"
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full rounded-md border border-border bg-bg py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:bg-surface sm:py-2"
            />
          </div>
        )}
        {selects.map((s) => (
          <select
            key={s.param}
            value={params.get(s.param) ?? ""}
            onChange={(e) => setParam(s.param, e.target.value)}
            aria-label={s.label}
            className="w-full rounded-md border border-border bg-bg px-3 py-2.5 text-sm text-ink sm:w-auto sm:max-w-[16rem] sm:py-2"
          >
            <option value="">{s.label}</option>
            {s.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}
        {active && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              push(new URLSearchParams());
            }}
            className="flex items-center justify-center gap-1 rounded-md px-2 py-2 text-sm text-ink-muted hover:text-accent-ink"
          >
            <X size={14} /> Clear filters
          </button>
        )}
        {rightSlot && <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{rightSlot}</div>}
      </div>
      {resultNote && <p className="text-xs text-ink-faint">{resultNote}</p>}
    </div>
  );
}
