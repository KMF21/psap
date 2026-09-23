import { FileBarChart } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Toolbar } from "@/components/ui/Toolbar";
import { students, exams, examSkills, skills, skillAssessments } from "@/lib/mock-data";

export default function ResultsPage() {
  const exam = exams.find((e) => e.id === "ex-ngc300")!;
  const examSkillsForExam = examSkills.filter((es) => es.examId === exam.id);

  const rows = students.map((student) => {
    const skillScores = examSkillsForExam.map((es) => {
      const assessment = skillAssessments.find((a) => a.examSkillId === es.id && a.studentId === student.id);
      return { es, score: assessment?.scaledScore ?? null };
    });
    const practicalTotal = skillScores.reduce((sum, s) => sum + (s.score ?? 0), 0);
    return { student, skillScores, practicalTotal };
  });

  return (
    <div>
      <PageHeader
        icon={FileBarChart}
        title="Results"
        subtitle={exam.title}
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Results" }]}
      />

      <div className="rounded-lg border border-border bg-surface">
        <Toolbar searchPlaceholder="Search by name or reg. number…" showExport />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-ink-faint">
              <th className="px-5 py-3 font-medium">Student</th>
              {examSkillsForExam.map((es) => {
                const skill = skills.find((s) => s.id === es.skillId);
                return (
                  <th key={es.id} className="px-4 py-3 text-right font-medium">
                    {skill?.name.split(" ").slice(0, 2).join(" ")}
                    <div className="font-normal text-ink-faint">/ {es.assignedMarks}</div>
                  </th>
                );
              })}
              <th className="px-5 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ student, skillScores, practicalTotal }) => (
              <tr key={student.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3.5">
                  <p className="font-medium text-ink">{student.fullName}</p>
                  <p className="text-xs tabular text-ink-faint">{student.registrationNumber}</p>
                </td>
                {skillScores.map(({ es, score }) => (
                  <td key={es.id} className="px-4 py-3.5 text-right tabular text-ink-muted">
                    {score ?? "—"}
                  </td>
                ))}
                <td className="px-5 py-3.5 text-right font-semibold tabular text-ink">
                  {practicalTotal} / {exam.practicalTargetTotal}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
