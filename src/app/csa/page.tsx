import { LayoutDashboard, AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMyExams, getMyUserId } from "@/lib/supabase/draws";

export const dynamic = "force-dynamic";

const statusLabel = { open: "Open", draft: "Not open yet", closed: "Closed" } as const;
const statusStyle = {
  open: { background: "var(--success-soft)", color: "var(--success)" },
  draft: { background: "var(--neutral-soft)", color: "var(--ink-muted)" },
  closed: { background: "var(--accent-soft)", color: "var(--accent-ink)" },
} as const;

export default async function CsaDashboard() {
  const { userId } = await auth();
  let exams: Awaited<ReturnType<typeof getMyExams>>["exams"] = [];
  let name = "there";
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const meId = userId ? await getMyUserId(supabase, userId) : null;
    if (!meId) {
      error = "Your account isn't set up in the database yet. Ask the Admin.";
    } else {
      const { data: me } = await supabase.from("users").select("full_name").eq("id", meId).maybeSingle();
      name = me?.full_name?.split(" ")[0] ?? name;
      const result = await getMyExams(supabase, meId);
      exams = result.exams;
      error = result.error;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  return (
    <div>
      <PageHeader icon={LayoutDashboard} title={`Welcome, ${name}`} subtitle="Your examinations" />

      {error ? (
        <div className="flex items-start gap-3 rounded-lg border p-5 text-sm" style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}>
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load your examinations.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      ) : exams.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-10 text-center text-sm text-ink-faint">
          You haven&apos;t been added to an examination yet. The Admin adds CSAs on each exam&apos;s page.
        </div>
      ) : (
        <ul className="space-y-3">
          {exams.map((e) => {
            const pct = e.eligible > 0 ? Math.round((e.practicalComplete / e.eligible) * 100) : 0;
            return (
              <li key={e.examId}>
                <Link href={`/csa/exams/${e.examId}`} className="block rounded-lg border border-border bg-surface p-4 hover:border-accent sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{e.title}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {e.courseCode}{e.level ? ` · ${e.level}` : ""} · compulsory + {e.drawsPerStudent} draw{e.drawsPerStudent !== 1 ? "s" : ""}
                        {e.hasProject ? " · project" : ""}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium" style={statusStyle[e.status]}>{statusLabel[e.status]}</span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-ink-muted">
                      <span className="tabular">
                        Practical {e.practicalComplete}/{e.eligible} done{e.hasProject ? ` · Project ${e.projectComplete}/${e.eligible}` : ""}
                      </span>
                      <ChevronRight size={16} className="text-ink-faint" />
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-soft">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--accent)" }} />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
