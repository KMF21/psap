"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Search } from "lucide-react";
import type { ExamBoard } from "@/lib/supabase/draws";

export function BoardClient({ board }: { board: ExamBoard }) {
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<"todo" | "all">("todo");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return board.students.filter(
      (s) =>
        (show === "all" || !s.complete || q.length > 0) &&
        (!q || s.fullName.toLowerCase().includes(q) || s.registrationNumber.toLowerCase().includes(q)),
    );
  }, [board.students, query, show]);

  const done = board.students.filter((s) => s.complete).length;

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="sticky top-14 z-10 space-y-2 rounded-t-lg border-b border-border bg-surface p-3 lg:top-0">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reg. number or name…"
            inputMode="search"
            autoComplete="off"
            className="w-full rounded-md border border-border bg-bg py-3 pl-9 pr-3 text-base text-ink placeholder:text-ink-faint"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex rounded-md border border-border p-0.5 text-sm">
            {(["todo", "all"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setShow(v)}
                className="rounded px-3 py-1.5 font-medium"
                style={show === v ? { background: "var(--accent-soft)", color: "var(--accent-ink)" } : { color: "var(--ink-muted)" }}
              >
                {v === "todo" ? "Still to assess" : "Everyone"}
              </button>
            ))}
          </div>
          <span className="text-xs tabular text-ink-muted">{done}/{board.students.length} done</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-ink-faint">
          {query ? "No students match your search." : show === "todo" ? "Everyone has been fully assessed." : "No students on this exam yet."}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((s) => (
            <li key={s.id}>
              <Link href={`/csa/exams/${board.examId}/students/${s.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-bg">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{s.fullName}</p>
                  <p className="text-xs tabular text-ink-faint">{s.registrationNumber}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {board.compulsory && (
                      <Dot state={s.compulsory ? (s.compulsory.status === "draft" ? "draft" : "done") : "empty"} label="C" />
                    )}
                    {Array.from({ length: board.drawsPerStudent }, (_, i) => {
                      const d = s.draws[i];
                      return <Dot key={i} state={d ? (d.status === "draft" ? "draft" : "done") : "empty"} label={d?.paperNumber ? `#${d.paperNumber}` : `${i + 1}`} />;
                    })}
                    {board.hasProject && <Dot state={s.project ? (s.project.status === "draft" ? "draft" : "done") : "empty"} label="P" />}
                  </div>
                </div>
                {s.complete ? <CheckCircle2 size={20} style={{ color: "var(--success)" }} /> : <ChevronRight size={18} className="text-ink-faint" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Dot({ state, label }: { state: "done" | "draft" | "empty"; label: string }) {
  const style =
    state === "done"
      ? { background: "var(--success-soft)", color: "var(--success)", borderColor: "transparent" }
      : state === "draft"
        ? { background: "var(--warn-soft)", color: "var(--warn)", borderColor: "transparent" }
        : { background: "transparent", color: "var(--ink-faint)", borderColor: "var(--border)" };
  return (
    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded border px-1.5 text-[11px] font-semibold tabular" style={style}>
      {label}
    </span>
  );
}
