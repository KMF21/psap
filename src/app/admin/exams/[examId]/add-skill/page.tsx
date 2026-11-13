import { ClipboardList, AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getExamDetail, getSkillOptions } from "@/lib/supabase/exams";
import { AddSkillForm } from "./AddSkillForm";

export default async function AddSkillToExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ role?: string; added?: string }>;
}) {
  const { examId } = await params;
  const { role, added } = await searchParams;

  let skills: Awaited<ReturnType<typeof getSkillOptions>> = [];
  let exam: Awaited<ReturnType<typeof getExamDetail>>["exam"] = null;
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const [skillList, detail] = await Promise.all([getSkillOptions(supabase), getExamDetail(supabase, examId)]);
    skills = skillList;
    exam = detail.exam;
    error = detail.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  if (!error && !exam) notFound();

  const onExam = new Set([...(exam?.pool ?? []).map((s) => s.skillId), ...(exam?.compulsory ? [exam.compulsory.skillId] : [])]);

  return (
    <div>
      <PageHeader
        icon={ClipboardList}
        title="Add skill to examination"
        subtitle={exam?.title}
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Examinations", href: "/admin/exams" },
          { label: exam?.title ?? "Exam", href: `/admin/exams/${examId}` },
          { label: "Add skill" },
        ]}
      />

      {error || !exam ? (
        <div className="flex items-start gap-3 rounded-lg border p-5 text-sm" style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}>
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load skills.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      ) : (
        <AddSkillForm
          examId={examId}
          skills={skills.filter((s) => !onExam.has(s.id))}
          defaultRole={role === "compulsory" ? "compulsory" : "drawn"}
          hasCompulsory={exam.compulsory !== null}
          poolMarks={exam.drawnMarks}
          usedPaperNumbers={exam.pool.map((s) => s.paperNumber).filter((n): n is number => n !== null)}
          justAdded={added === "1"}
        />
      )}
    </div>
  );
}
