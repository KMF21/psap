import { ClipboardList, Plus, AlertTriangle, CheckCircle2, Circle, Users, BarChart3, FileBarChart, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCsaOptions, getExamDetail, type ExamSkillRow } from "@/lib/supabase/exams";
import { ExamStatusSelect } from "./ExamStatusSelect";
import { ExamSettingsCard } from "./ExamSettingsCard";
import { ExamCsasCard } from "./ExamCsasCard";
import { ChaptersCard } from "./ChaptersCard";
import { RemoveSkillButton } from "./RemoveSkillButton";
import { DeleteExamCard } from "./DeleteExamCard";

function SkillRowActions({ examId, skill }: { examId: string; skill: ExamSkillRow }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/admin/exams/${examId}/skills/${skill.id}/edit`}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-ink-muted hover:bg-bg hover:text-accent-ink"
      >
        <Pencil size={12} /> Edit
      </Link>
      <RemoveSkillButton examId={examId} examSkillId={skill.id} skillName={skill.skillName} scoreCount={skill.scoreCount} />
    </div>
  );
}

export default async function ExamDetailPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;

  let exam: Awaited<ReturnType<typeof getExamDetail>>["exam"] = null;
  let allCsas: Awaited<ReturnType<typeof getCsaOptions>> = [];
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const [result, csas] = await Promise.all([getExamDetail(supabase, examId), getCsaOptions(supabase)]);
    exam = result.exam;
    error = result.error;
    allCsas = csas;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  if (error) {
    return (
      <div>
        <PageHeader icon={ClipboardList} title="Examination" breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Examinations", href: "/admin/exams" }]} />
        <div className="flex items-start gap-3 rounded-lg border p-5 text-sm" style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}>
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load this examination from the database.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  if (!exam) notFound();

  // Deactivated CSAs who are still on the exam must stay visible (and removable).
  const csaChoices = [...allCsas, ...exam.csas.filter((c) => !allCsas.some((a) => a.id === c.id))];
  const hasProject = exam.examType === "practical_and_project";

  const readiness = [
    { ok: exam.compulsory !== null, label: "One compulsory skill" },
    {
      ok: exam.pool.length >= exam.drawsPerStudent,
      label: `Draw pool has at least ${exam.drawsPerStudent} skill${exam.drawsPerStudent !== 1 ? "s" : ""} (now ${exam.pool.length})`,
    },
    { ok: exam.csas.length > 0, label: "At least one CSA assigned" },
    { ok: exam.eligibleCount > 0, label: `Students on the roster (${exam.eligibleCount})` },
    ...(hasProject ? [{ ok: exam.components.length > 0, label: "Project chapters set" }] : []),
  ];
  const ready = readiness.every((r) => r.ok);

  return (
    <div>
      <PageHeader
        icon={ClipboardList}
        title={exam.title}
        subtitle={`${exam.courseCode} · ${exam.academicSession}`}
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Examinations", href: "/admin/exams" },
          { label: exam.title },
        ]}
        action={<ExamStatusSelect examId={exam.id} initialStatus={exam.status} />}
      />

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Link href={`/admin/exams/${exam.id}/eligibility`} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 hover:border-accent">
          <Users size={18} className="text-ink-faint" />
          <div>
            <p className="text-sm font-semibold text-ink">Student roster</p>
            <p className="text-xs text-ink-muted">{exam.eligibleCount} on this exam · add or remove</p>
          </div>
        </Link>
        <Link href={`/admin/exams/${exam.id}/progress`} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 hover:border-accent">
          <BarChart3 size={18} className="text-ink-faint" />
          <div>
            <p className="text-sm font-semibold text-ink">Live progress</p>
            <p className="text-xs text-ink-muted">Who still needs assessing</p>
          </div>
        </Link>
        <Link href={`/admin/results/${exam.id}`} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 hover:border-accent">
          <FileBarChart size={18} className="text-ink-faint" />
          <div>
            <p className="text-sm font-semibold text-ink">Results</p>
            <p className="text-xs text-ink-muted">Scores, corrections, exports</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Compulsory skill */}
          <section className="rounded-lg border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-sm font-semibold text-ink">Compulsory skill</h2>
                <p className="text-xs text-ink-muted">Every student on the roster is assessed on it — no draw.</p>
              </div>
              {!exam.compulsory && (
                <Link
                  href={`/admin/exams/${exam.id}/add-skill?role=compulsory`}
                  className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-ink hover:bg-bg"
                >
                  <Plus size={13} /> Set compulsory skill
                </Link>
              )}
            </div>
            {exam.compulsory ? (
              <div className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{exam.compulsory.skillName}</p>
                  <p className="text-xs text-ink-muted">
                    Library #{exam.compulsory.skillNumber} · <span className="font-semibold tabular text-ink">{exam.compulsory.assignedMarks} marks</span> (rubric /{" "}
                    {exam.compulsory.nativeTotal}) · {exam.compulsory.scoreCount} scored
                  </p>
                </div>
                <SkillRowActions examId={exam.id} skill={exam.compulsory} />
              </div>
            ) : (
              <p className="px-5 py-6 text-center text-sm text-ink-faint">No compulsory skill yet.</p>
            )}
          </section>

          {/* Draw pool */}
          <section className="rounded-lg border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-sm font-semibold text-ink">Draw pool</h2>
                <p className="text-xs text-ink-muted">
                  Each student draws {exam.drawsPerStudent} paper{exam.drawsPerStudent !== 1 ? "s" : ""}. Papers go back, so skills can repeat across students.
                  {exam.drawnMarks !== null && <> Every drawn skill is worth <strong className="text-ink">{exam.drawnMarks}</strong> marks.</>}
                </p>
              </div>
              <Link
                href={`/admin/exams/${exam.id}/add-skill?role=drawn`}
                className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-ink hover:bg-bg"
              >
                <Plus size={13} /> Add skill
              </Link>
            </div>
            {exam.pool.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-faint">No skills in the draw pool yet.</p>
            ) : (
              <>
                <ul className="divide-y divide-border sm:hidden">
                  {exam.pool.map((s) => (
                    <li key={s.id} className="px-4 py-3.5">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-bold tabular" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                          {s.paperNumber}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-ink">{s.skillName}</p>
                          <p className="text-xs text-ink-muted">{s.assignedMarks} marks · rubric / {s.nativeTotal} · {s.scoreCount} scored</p>
                        </div>
                      </div>
                      <div className="mt-1"><SkillRowActions examId={exam.id} skill={s} /></div>
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-ink-faint">
                        <th className="px-5 py-2.5 font-medium">Paper</th>
                        <th className="px-5 py-2.5 font-medium">Skill</th>
                        <th className="px-5 py-2.5 text-right font-medium">Marks</th>
                        <th className="px-5 py-2.5 text-right font-medium">Rubric</th>
                        <th className="px-5 py-2.5 text-right font-medium">Scored</th>
                        <th className="px-5 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {exam.pool.map((s) => (
                        <tr key={s.id} className="border-b border-border last:border-0">
                          <td className="px-5 py-3">
                            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-sm font-bold tabular" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                              {s.paperNumber}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-ink">{s.skillName}</td>
                          <td className="px-5 py-3 text-right font-semibold tabular text-ink">{s.assignedMarks}</td>
                          <td className="px-5 py-3 text-right tabular text-ink-faint">/ {s.nativeTotal}</td>
                          <td className="px-5 py-3 text-right tabular text-ink-muted">{s.scoreCount}</td>
                          <td className="px-5 py-3"><SkillRowActions examId={exam.id} skill={s} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <ExamSettingsCard
            examId={exam.id}
            initial={{ title: exam.title, drawsPerStudent: exam.drawsPerStudent, examType: exam.examType }}
            compulsoryMarks={exam.compulsory?.assignedMarks ?? null}
            drawnMarks={exam.drawnMarks}
            projectMaxTotal={exam.projectMaxTotal}
            hasProjectScores={exam.hasProjectScores}
          />
        </div>

        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-ink">Ready to open?</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {readiness.map((r) => (
                <li key={r.label} className="flex items-start gap-2">
                  {r.ok ? (
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: "var(--success)" }} />
                  ) : (
                    <Circle size={16} className="mt-0.5 shrink-0 text-ink-faint" />
                  )}
                  <span className={r.ok ? "text-ink" : "text-ink-muted"}>{r.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-faint">
              {ready ? "Everything is in place. Set the status to Open when the exam starts." : "Complete the items above before opening the exam."}
            </p>
          </section>

          <ExamCsasCard examId={exam.id} allCsas={csaChoices} initialIds={exam.csas.map((c) => c.id)} />

          {hasProject && (
            <ChaptersCard
              key={exam.components.map((c) => `${c.id}:${c.name}:${c.maxMarks}`).join("|")}
              examId={exam.id} initial={exam.components}
              locked={exam.hasProjectScores}
            />
          )}

          <DeleteExamCard examId={exam.id} title={exam.title} eligibleCount={exam.eligibleCount} />
        </div>
      </div>
    </div>
  );
}
