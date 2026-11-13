import { ClipboardList, AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getExamSkillForEdit } from "@/lib/supabase/exams";
import { EditExamSkillForm } from "./EditExamSkillForm";

export default async function EditExamSkillPage({ params }: { params: Promise<{ examId: string; examSkillId: string }> }) {
  const { examId, examSkillId } = await params;

  let data: Awaited<ReturnType<typeof getExamSkillForEdit>>["data"] = null;
  let error: string | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    const result = await getExamSkillForEdit(supabase, examSkillId);
    data = result.data;
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }
  if (!error && (!data || data.examId !== examId)) notFound();

  return (
    <div>
      <PageHeader
        icon={ClipboardList}
        title="Edit exam skill"
        subtitle={data?.examTitle}
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Examinations", href: "/admin/exams" },
          { label: data?.examTitle ?? "Exam", href: `/admin/exams/${examId}` },
          { label: "Edit skill" },
        ]}
      />
      {error || !data ? (
        <div className="flex items-start gap-3 rounded-lg border p-5 text-sm" style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}>
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      ) : (
        <EditExamSkillForm examSkill={data} />
      )}
    </div>
  );
}
