import { LayoutDashboard, AlertTriangle, FolderCheck } from "lucide-react";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMyAssignments, getMyProjectAssignments } from "@/lib/supabase/scoring";

function progressStatus(submitted: number, eligible: number) {
  return eligible > 0 && submitted === eligible ? "submitted" : submitted > 0 ? "draft" : "pending";
}

export default async function CsaDashboard() {
  const user = await currentUser();
  const firstName = user?.firstName ?? "there";

  let assignments: Awaited<ReturnType<typeof getMyAssignments>>["assignments"] = [];
  let projectAssignments: Awaited<ReturnType<typeof getMyProjectAssignments>>["assignments"] = [];
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const [skillResult, projectResult] = await Promise.all([getMyAssignments(supabase), getMyProjectAssignments(supabase)]);
    assignments = skillResult.assignments;
    error = skillResult.error;
    projectAssignments = projectResult.assignments;
    if (!error) error = projectResult.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  const nothingAssigned = assignments.length === 0 && projectAssignments.length === 0;

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
      ) : nothingAssigned ? (
        <div className="rounded-lg border border-border bg-surface p-10 text-center text-sm text-ink-faint">
          Nothing assigned to you yet. Check back once an Admin sets up an exam assignment.
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
                <StatusPill status={progressStatus(a.totalSubmitted, a.totalEligible)} />
              </div>
            </Link>
          ))}

          {projectAssignments.map((a) => (
            <Link
              key={a.examId}
              href={`/csa/project/${a.examId}`}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-5 hover:border-accent"
            >
              <div className="flex items-center gap-2.5">
                <FolderCheck size={16} className="text-ink-faint" />
                <div>
                  <p className="text-sm font-semibold text-ink">Project assessment</p>
                  <p className="mt-1 text-xs text-ink-muted">{a.examTitle} · {a.maxMarks} marks</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm tabular text-ink-muted">{a.totalSubmitted} of {a.totalEligible} scored</p>
                <StatusPill status={progressStatus(a.totalSubmitted, a.totalEligible)} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
