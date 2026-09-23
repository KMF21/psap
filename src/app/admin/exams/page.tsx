import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { exams, courses, examSkills } from "@/lib/mock-data";

export default function ExamsPage() {
  return (
    <div>
      <PageHeader
        icon={ClipboardList}
        title="Examinations"
        subtitle="Configure exam structures, skill mark allocation, and CSA assignments"
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Examinations" }]}
        action={
          <button
            className="flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium text-white"
            style={{ background: "var(--accent)" }}
          >
            <Plus size={15} /> Create examination
          </button>
        }
      />

      <div className="space-y-4">
        {exams.map((exam) => {
          const course = courses.find((c) => c.id === exam.courseId);
          const skillCount = examSkills.filter((es) => es.examId === exam.id).length;
          return (
            <Link
              key={exam.id}
              href={`/admin/exams/${exam.id}`}
              className="block rounded-lg border border-border bg-surface p-5 transition-colors hover:border-accent"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">{exam.title}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {course?.code} · {exam.academicSession} · {skillCount} skill{skillCount !== 1 ? "s" : ""} configured
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular text-ink">
                      {exam.practicalTargetTotal}{exam.projectMaxTotal > 0 && ` + ${exam.projectMaxTotal}`}
                    </p>
                    <p className="text-xs text-ink-faint">practical{exam.projectMaxTotal > 0 && " + project"}</p>
                  </div>
                  <StatusPill status={exam.status === "open" ? "submitted" : exam.status === "closed" ? "amended" : "draft"} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
