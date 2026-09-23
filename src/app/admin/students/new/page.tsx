"use client";

import { useActionState } from "react";
import Link from "next/link";
import { UserPlus, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { createStudentAction } from "./actions";

export default function NewStudentPage() {
  const [state, formAction, isPending] = useActionState(createStudentAction, { error: null });

  return (
    <div>
      <PageHeader
        icon={UserPlus}
        title="Add student"
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Students", href: "/admin/students" },
          { label: "Add student" },
        ]}
      />

      <form action={formAction} className="max-w-lg space-y-4 rounded-lg border border-border bg-surface p-6">
        {state.error && (
          <div
            className="flex items-start gap-2 rounded-md p-3 text-sm"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <div>
          <label htmlFor="registrationNumber" className="mb-1.5 block text-sm font-medium text-ink">
            Registration number
          </label>
          <input
            id="registrationNumber"
            name="registrationNumber"
            required
            placeholder="e.g. DCH/25/041"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
          />
        </div>

        <div>
          <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-ink">
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            required
            placeholder="e.g. Aminu Aisha Iya"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
          />
        </div>

        <div>
          <label htmlFor="level" className="mb-1.5 block text-sm font-medium text-ink">
            Level
          </label>
          <input
            id="level"
            name="level"
            placeholder="e.g. DCH 200 LEVEL"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: "var(--accent)" }}
          >
            {isPending ? "Saving…" : "Save student"}
          </button>
          <Link href="/admin/students" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-bg">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
