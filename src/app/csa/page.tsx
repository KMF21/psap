import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { examSkills, skills, exams, students, skillAssessments, csas } from "@/lib/mock-data";

export default function CsaDashboard() {
  const me = csas[0];
  const myAssignments = examSkills.filter((es) => es.assignedCsaIds.includes(me.id));

  return (
    <div>
      <PageHeader
        icon={LayoutDashboard}
        title={`Welcome, ${me.fullName.split(" ")[0]}`}
        subtitle="Your assigned skills and scoring progress"
      />

      <div className="space-y-3">
        {myAssignments.map((es) => {
          const skill = skills.find((s) => s.id === es.skillId);
          const exam = exams.find((e) => e.id === es.examId);
          const relevant = skillAssessments.filter((a) => a.examSkillId === es.id);
          const done = relevant.filter((a) => a.status === "submitted").length;
          const total = students.length;

          return (
            <Link
              key={es.id}
              href={`/csa/scoring/${es.id}`}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-5 hover:border-accent"
            >
              <div>
                <p className="text-sm font-semibold text-ink">{skill?.name}</p>
                <p className="mt-1 text-xs text-ink-muted">{exam?.title} · {es.assignedMarks} marks</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm tabular text-ink-muted">{done} of {total} scored</p>
                <StatusPill status={done === total ? "submitted" : done > 0 ? "draft" : "pending"} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
