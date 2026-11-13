import { History, AlertTriangle, Send, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuditLog } from "@/lib/supabase/audit";

function formatValue(v: Record<string, unknown> | null): string {
  if (!v) return "—";
  const parts: string[] = [];
  if ("raw_score" in v && v.raw_score !== null) parts.push(`raw ${v.raw_score}`);
  if ("scaled_score" in v && v.scaled_score !== null) parts.push(`scaled ${v.scaled_score}`);
  if ("score" in v && v.score !== null) parts.push(`score ${v.score}`);
  if ("chapters" in v && v.chapters && typeof v.chapters === "object") {
    parts.push(Object.entries(v.chapters as Record<string, unknown>).map(([k, n]) => `${k}: ${n}`).join(", "));
  }
  if ("total" in v) parts.push(`total ${v.total}`);
  if ("assigned_marks" in v) parts.push(`${v.assigned_marks} marks`);
  if ("scores_recalculated" in v) parts.push(`${v.scores_recalculated} score(s) recalculated`);
  if ("scores_deleted" in v) parts.push(`${v.scores_deleted} score(s) deleted`);
  if ("paper" in v && v.paper !== null) parts.push(`paper #${v.paper}`);
  if ("full_name" in v) parts.push(String(v.full_name));
  if ("students" in v) parts.push(`${v.students} students, ${v.skill_scores ?? 0} skill + ${v.project_scores ?? 0} project scores`);
  if ("status" in v && v.status) parts.push(String(v.status));
  return parts.join(" · ") || "—";
}

const actionMeta: Record<string, { label: string; tone: "ok" | "warn" | "danger" }> = {
  submit: { label: "Submission", tone: "ok" },
  admin_edit: { label: "Admin correction", tone: "warn" },
  marks_change: { label: "Marks changed", tone: "warn" },
  reassign: { label: "Paper reassigned", tone: "warn" },
  release_claim: { label: "Draft released", tone: "warn" },
  rename: { label: "CSA renamed", tone: "warn" },
  remove_from_exam: { label: "Removed from exam", tone: "danger" },
  remove_skill: { label: "Skill removed", tone: "danger" },
  delete_exam: { label: "Exam deleted", tone: "danger" },
  delete_skill: { label: "Skill deleted", tone: "danger" },
};
const toneStyle = {
  ok: { background: "var(--success-soft)", color: "var(--success)" },
  warn: { background: "var(--warn-soft)", color: "var(--warn)" },
  danger: { background: "var(--danger-soft)", color: "var(--danger)" },
} as const;

export default async function AuditLogPage() {
  let entries: Awaited<ReturnType<typeof getAuditLog>>["entries"] = [];
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const result = await getAuditLog(supabase);
    entries = result.entries;
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  return (
    <div>
      <PageHeader
        icon={History}
        title="Audit log"
        subtitle="Submissions, Admin corrections and every structural change, most recent first"
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Audit log" }]}
      />

      {error ? (
        <div
          className="flex items-start gap-3 rounded-lg border p-5 text-sm"
          style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load the audit log.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-10 text-center text-sm text-ink-faint">
          Nothing logged yet — entries appear here as CSAs submit scores and Admin makes corrections.
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-faint">
                <th className="px-5 py-3 font-medium">When</th>
                <th className="px-5 py-3 font-medium">Action</th>
                <th className="px-5 py-3 font-medium">Student</th>
                <th className="px-5 py-3 font-medium">Context</th>
                <th className="px-5 py-3 font-medium">By</th>
                <th className="px-5 py-3 font-medium">Before → After</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs tabular text-ink-faint">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium"
                      style={toneStyle[actionMeta[e.action]?.tone ?? "warn"]}
                    >
                      {e.action === "submit" ? <Send size={11} /> : <ShieldAlert size={11} />}
                      {actionMeta[e.action]?.label ?? e.action}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-ink">{e.studentName ?? "—"}</td>
                  <td className="px-5 py-3.5 text-ink-muted">{e.contextLabel ?? "—"}</td>
                  <td className="px-5 py-3.5 text-ink-muted">{e.actorName}</td>
                  <td className="px-5 py-3.5 text-xs tabular text-ink-muted">
                    {e.previousValue && e.newValue ? (
                      <>
                        {formatValue(e.previousValue)} <span className="text-ink-faint">→</span> {formatValue(e.newValue)}
                      </>
                    ) : (
                      formatValue(e.newValue ?? e.previousValue)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
