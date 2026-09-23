import { LayoutDashboard, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMyAssignments } from "@/lib/supabase/scoring";

export default async function CsaDashboard() {
  const user = await currentUser();
  const firstName = user?.firstName ?? "there";

  let assignments: Awaited<ReturnType<typeof getMyAssignments>>["assignments"] = [];
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const result = await getMyAssignments(supabase);
    assignments = result.assignments;
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  return (
    <div>
      <PageHeader
        icon={LayoutDashboard}
        title={`Welcome, ${firstName}`}
        subtitle="Your assigned skills and scoring progress"
      />

      {error ? (
        <div
          className="flex items-start gap-3 rounded-lg border p-5 text-sm"
          style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load your assignments.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      ) : assignments.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-10 text-center text-sm text-ink-faint">
          No skills assigned to you yet. Check back once an Admin sets up an exam assignment.
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <Link
              key={a.examSkillId}
              href={`/csa/scoring/${a.examSkillId}`}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-5 hover:border-accent"
            >
              <div>
                <p className="text-sm font-semibold text-ink">{a.skillName}</p>
                <p className="mt-1 text-xs text-ink-muted">{a.examTitle} · {a.assignedMarks} marks</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm tabular text-ink-muted">{a.totalSubmitted} of {a.totalEligible} scored</p>
                <StatusPill
                  status={
                    a.totalEligible > 0 && a.totalSubmitted === a.totalEligible
                      ? "submitted"
                      : a.totalSubmitted > 0
                        ? "draft"
                        : "pending"
                  }
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
