import { ListChecks, Plus, Clock, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { skills } from "@/lib/mock-data";

export default function SkillsPage() {
  return (
    <div>
      <PageHeader
        icon={ListChecks}
        title="Skills & rubrics"
        subtitle={`${skills.length} of 15 skills configured`}
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Skills & rubrics" }]}
        action={
          <button
            className="flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium text-white"
            style={{ background: "var(--accent)" }}
          >
            <Plus size={15} /> Add skill
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {skills.map((skill) => {
          const pending = skill.steps.length === 1 && skill.steps[0].description.startsWith("Pending");
          return (
            <div key={skill.id} className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-ink">{skill.name}</h3>
                  <div className="mt-1 flex items-center gap-3 text-xs text-ink-faint">
                    <span className="flex items-center gap-1"><Clock size={12} /> {skill.timeAllowedMinutes} min allowed</span>
                    <span>{skill.steps.length} step{skill.steps.length !== 1 ? "s" : ""}</span>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
