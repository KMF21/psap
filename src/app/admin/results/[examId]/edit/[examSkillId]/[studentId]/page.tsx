import { ShieldAlert, AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAssessmentForEdit } from "@/lib/supabase/scoring";
import { AdminEditForm } from "./AdminEditForm";

export default async function AdminEditAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string; examSkillId: string; studentId: string }>;
  searchParams: Promise<{ reassigned?: string }>;
}) {
  const { examId, examSkillId, studentId } = await params;
  const { reassigned } = await searchParams;

  let data: Awaited<ReturnType<typeof getAssessmentForEdit>>["data"] = null;
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const result = await getAssessmentForEdit(supabase, examSkillId, studentId);
    data = result.data;
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  if (error) {
    return (
      <div>
        <PageHeader icon={ShieldAlert} title="Correct assessment" breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Results", href: "/admin/results" }]} />
        <div
          className="flex items-start gap-3 rounded-lg border p-5 text-sm"
          style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load this assessment.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.assessmentId || data.examId !== examId) notFound();

  return (
    <div>
      <PageHeader
        icon={ShieldAlert}
        title={`Correct: ${data.studentName}`}
        subtitle={`${data.examTitle} · ${data.studentRegNumber}`}
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Results", href: "/admin/results" },
          { label: data.examTitle || "Exam", href: `/admin/results/${examId}` },
          { label: "Correct assessment" },
        ]}
      />
      <AdminEditForm data={data} justReassigned={reassigned === "1"} />
    </div>
  );
}
