import { ShieldAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProjectAssessmentsForEdit } from "@/lib/supabase/scoring";
import { ProjectEditForm } from "./ProjectEditForm";

export default async function AdminEditProjectPage({ params }: { params: Promise<{ examId: string; studentId: string }> }) {
  const { examId, studentId } = await params;

  let result: Awaited<ReturnType<typeof getProjectAssessmentsForEdit>> | null = null;
  let error: string | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    result = await getProjectAssessmentsForEdit(supabase, examId, studentId);
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  if (error) {
    return (
      <div>
        <PageHeader icon={ShieldAlert} title="Correct project score" breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Results", href: "/admin/results" }]} />
        <p className="text-sm" style={{ color: "var(--danger)" }}>Couldn&apos;t load this project score: {error}</p>
      </div>
    );
  }
  if (!result || !result.studentName || result.rows.length === 0) notFound();

  return (
    <div>
      <PageHeader
        icon={ShieldAlert}
        title={`Correct project score: ${result.studentName}`}
        subtitle={`${result.examTitle ?? "Examination"} · ${result.studentRegNumber ?? ""}`}
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Results", href: "/admin/results" },
          { label: "Exam", href: `/admin/results/${examId}` },
          { label: "Correct project score" },
        ]}
      />
      <ProjectEditForm examId={examId} studentId={studentId} rows={result.rows} />
    </div>
  );
}
