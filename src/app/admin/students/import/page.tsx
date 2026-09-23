"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { importStudentsAction, type ImportState } from "./actions";

export default function ImportStudentsPage() {
  const [state, formAction, isPending] = useActionState<ImportState, FormData>(importStudentsAction, {
    error: null,
    result: null,
  });

  return (
    <div>
      <PageHeader
        icon={Upload}
        title="Bulk import students"
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Students", href: "/admin/students" },
          { label: "Bulk import" },
        ]}
      />

      <div className="max-w-xl space-y-5 rounded-lg border border-border bg-surface p-6">
        <div className="rounded-md bg-neutral-soft p-4 text-xs text-ink-muted">
          <p className="font-medium text-ink">CSV format</p>
          <p className="mt-1">
            First row must be a header with a registration number column and a full name column — a level column is
            optional. Common header names are recognized automatically, e.g.:
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-surface p-2 text-[11px] text-ink">
Registration Number,Full Name,Level{"\n"}DCH/25/041,Aminu Bello,DCH 200 LEVEL
          </pre>
          <p className="mt-2">Students already in the system (matched by registration number) are skipped, not duplicated.</p>
        </div>

        {state.error && (
          <div
            className="flex items-start gap-2 rounded-md p-3 text-sm"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        {state.result && (
          <div
            className="flex items-start gap-2 rounded-md p-3 text-sm"
            style={{ background: "var(--success-soft)", color: "var(--success)" }}
          >
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Import complete.</p>
              <p className="mt-0.5">
                {state.result.inserted} added, {state.result.skipped} already existed and were skipped
                {state.result.invalidRowCount > 0 && `, ${state.result.invalidRowCount} row(s) missing required fields were ignored`}.
              </p>
            </div>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="file" className="mb-1.5 block text-sm font-medium text-ink">
              CSV file
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              className="block w-full text-sm text-ink file:mr-3 file:rounded-md file:border file:border-border file:bg-bg file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink"
            />
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-4">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ background: "var(--accent)" }}
            >
              {isPending ? "Importing…" : "Import students"}
            </button>
            <Link href="/admin/students" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-bg">
              Back to students
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
