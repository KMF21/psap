import { Users, AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCsaOptions, getExamDetail } from "@/lib/supabase/exams";
import { ProjectCsaForm } from "./ProjectCsaForm";

export default async function ProjectCsasPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;

  let csas: Awaited<ReturnType<typeof getCsaOptions>> = [];
  let currentlyAssignedNames: string[] = [];
  let projectMaxTotal = 0;
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const [csaOptions, examResult] = await Promise.all([getCsaOptions(supabase), getExamDetail(supabase, examId)]);
    csas = csaOptions;
    if (examResult.error) error = examResult.error;
    if (!examResult.exam) return notFound();
    currentlyAssignedNames = examResult.exam.projectCsaNames;
    projectMaxTotal = examResult.exam.projectMaxTotal;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Assign project assessors"
        subtitle="Choose which CSA(s) independently score the project component for this exam"
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Examinations", href: "/admin/exams" },
          { label: "Exam", href: `/admin/exams/${examId}` },
          { label: "Project CSAs" },
        ]}
      />

      {error ? (
        <div
          className="flex items-start gap-3 rounded-lg border p-5 text-sm"
          style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load data.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      ) : (
        <ProjectCsaForm examId={examId} csas={csas} currentlyAssignedNames={currentlyAssignedNames} projectMaxTotal={projectMaxTotal} />
      )}
    </div>
  );
}
