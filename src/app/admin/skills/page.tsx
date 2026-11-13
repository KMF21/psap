import { ListChecks, Plus, Clock, AlertCircle, AlertTriangle, Pencil, Lock } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSkills, getSkillUsage, isPendingRubric, type SkillUsage } from "@/lib/supabase/skills";

export default async function SkillsPage() {
  let skills: Awaited<ReturnType<typeof getSkills>>["skills"] = [];
  let usage = new Map<string, SkillUsage>();
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const [result, u] = await Promise.all([getSkills(supabase), getSkillUsage(supabase)]);
    skills = result.skills;
    usage = u;
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  return (
    <div>
      <PageHeader
        icon={ListChecks}
        title="Skills & rubrics"
        subtitle={error ? "Unable to load skills" : `${skills.length} skill${skills.length !== 1 ? "s" : ""} · each has a permanent number used for paper draws`}
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Skills & rubrics" }]}
        action={
          <Link
            href="/admin/skills/new"
            className="flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium text-white"
            style={{ background: "var(--accent)" }}
          >
            <Plus size={15} /> Add skill
          </Link>
        }
      />


      {error ? (
        <div
          className="flex items-start gap-3 rounded-lg border p-5 text-sm"
          style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load skills from the database.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      ) : skills.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-10 text-center text-sm text-ink-faint">
          No skills yet. <Link href="/admin/skills/new" className="font-medium text-accent-ink hover:underline">Add the first skill</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {skills.map((skill) => {
            const pending = isPendingRubric(skill);
            const u = usage.get(skill.id);
            return (
              <div key={skill.id} className="rounded-lg border border-border bg-surface p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-md px-1.5 text-sm font-bold tabular" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                      {skill.skillNumber}
                    </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-ink">{skill.name}</h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-ink-faint">
                      <span className="flex items-center gap-1"><Clock size={12} /> {skill.timeAllowedMinutes} min allowed</span>
                      <span>{skill.steps.length} step{skill.steps.length !== 1 ? "s" : ""}</span>
                      {u && u.examCount > 0 && <span>in {u.examCount} exam{u.examCount !== 1 ? "s" : ""}</span>}
                      {u && u.scoreCount > 0 && <span className="flex items-center gap-1"><Lock size={11} /> scored</span>}
                    </div>
                  </div>
                  </div>
                  <span className="rounded-md bg-neutral-soft px-2.5 py-1 text-xs font-semibold tabular text-ink">
                    {skill.nativeTotal} marks
                  </span>
                </div>

                {pending ? (
                  <div className="mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-xs" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
                    <AlertCircle size={13} />
                    Awaiting official step breakdown from client
                  </div>
                ) : (
                  <ul className="mt-3 space-y-1.5">
                    {skill.steps.slice(0, 3).map((step) => (
                      <li key={step.id} className="flex items-center justify-between text-xs text-ink-muted">
                        <span className="truncate pr-3">{step.description}</span>
                        <span className="shrink-0 tabular">{step.maxMarks}</span>
                      </li>
                    ))}
                    {skill.steps.length > 3 && (
                      <li className="text-xs text-accent-ink">+{skill.steps.length - 3} more steps</li>
                    )}
                  </ul>
                )}
                <div className="mt-3 flex justify-end border-t border-border pt-3">
                  <Link href={`/admin/skills/${skill.id}/edit`} className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-accent-ink">
                    <Pencil size={12} /> Edit or delete
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
