import { ListChecks, AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getExamSkillForEdit, getCsaOptions } from "@/lib/supabase/exams";
import { EditExamSkillForm } from "./EditExamSkillForm";

export default async function EditExamSkillPage({
  params,
}: {
  params: Promise<{ examId: string; examSkillId: string }>;
}) {
  const { examId, examSkillId } = await params;

  let data: Awaited<ReturnType<typeof getExamSkillForEdit>>["data"] = null;
  let csas: Awaited<ReturnType<typeof getCsaOptions>> = [];
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const [esResult, csaOptions] = await Promise.all([getExamSkillForEdit(supabase, examSkillId), getCsaOptions(supabase)]);
    data = esResult.data;
    error = esResult.error;
    csas = csaOptions;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  if (error) {
    return (
      <div>
        <PageHeader icon={ListChecks} title="Edit skill assignment" breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Examinations", href: "/admin/exams" }]} />
        <div
          className="flex items-start gap-3 rounded-lg border p-5 text-sm"
          style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load this skill assignment.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) notFound();

  return (
    <div>
      <PageHeader
        icon={ListChecks}
        title={`Edit: ${data.skillName}`}
        subtitle="Change marks, compulsory status, or assigned CSA(s) for this exam"
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Examinations", href: "/admin/exams" },
          { label: "Exam", href: `/admin/exams/${examId}` },
          { label: "Edit skill" },
        ]}
      />
      <EditExamSkillForm data={data} csas={csas} />
    </div>
  );
}
