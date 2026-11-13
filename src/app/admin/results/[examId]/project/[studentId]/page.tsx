import { ShieldAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProjectForAdminEdit } from "@/lib/supabase/scoring";
import { ProjectEditForm } from "./ProjectEditForm";

export default async function AdminEditProjectPage({ params }: { params: Promise<{ examId: string; studentId: string }> }) {
  const { examId, studentId } = await params;

  let data: Awaited<ReturnType<typeof getProjectForAdminEdit>>["data"] = null;
  let error: string | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    const result = await getProjectForAdminEdit(supabase, examId, studentId);
    data = result.data;
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  if (error) {
    return (
      <div>
        <PageHeader icon={ShieldAlert} title="Project scores" breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Results", href: "/admin/results" }]} />
        <p className="text-sm" style={{ color: "var(--danger)" }}>Couldn&apos;t load this project: {error}</p>
      </div>
    );
  }
  if (!data) notFound();

  return (
    <div>
      <PageHeader
        icon={ShieldAlert}
        title={`Project: ${data.studentName}`}
        subtitle={`${data.examTitle} · ${data.studentRegNumber}`}
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Results", href: "/admin/results" },
          { label: data.examTitle, href: `/admin/results/${examId}` },
          { label: "Project" },
        ]}
      />
      {data.components.length === 0 ? (
        <p className="text-sm text-ink-muted">This exam has no project chapters yet. Add them on the exam page.</p>
      ) : (
        <ProjectEditForm examId={examId} studentId={studentId} data={data} />
      )}
    </div>
  );
}
