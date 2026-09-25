import { History, AlertTriangle, Send, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuditLog } from "@/lib/supabase/audit";

function formatValue(v: Record<string, unknown> | null): string {
  if (!v) return "—";
  const parts: string[] = [];
  if ("raw_score" in v) parts.push(`raw ${v.raw_score}`);
  if ("scaled_score" in v) parts.push(`scaled ${v.scaled_score}`);
  if ("score" in v) parts.push(`score ${v.score}`);
  if ("status" in v) parts.push(String(v.status));
  return parts.join(" · ") || "—";
}

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
        subtitle="Every score submission and every Admin correction, most recent first"
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
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                      style={
                        e.action === "admin_edit"
                          ? { background: "var(--warn-soft)", color: "var(--warn)" }
                          : { background: "var(--success-soft)", color: "var(--success)" }
                      }
                    >
                      {e.action === "admin_edit" ? <ShieldAlert size={11} /> : <Send size={11} />}
                      {e.action === "admin_edit" ? "Admin correction" : "Submission"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-ink">{e.studentName ?? "—"}</td>
                  <td className="px-5 py-3.5 text-ink-muted">{e.contextLabel ?? "—"}</td>
                  <td className="px-5 py-3.5 text-ink-muted">{e.actorName}</td>
                  <td className="px-5 py-3.5 text-xs tabular text-ink-muted">
                    {e.action === "admin_edit" ? (
                      <>
                        {formatValue(e.previousValue)} <span className="text-ink-faint">→</span> {formatValue(e.newValue)}
                      </>
                    ) : (
                      formatValue(e.newValue)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
