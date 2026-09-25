import { FolderCheck, AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProjectScoringPageData } from "@/lib/supabase/scoring";
import { ProjectScoringClient } from "./ProjectScoringClient";

export default async function ProjectScoringPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;

  let data: Awaited<ReturnType<typeof getProjectScoringPageData>>["data"] = null;
  let students: Awaited<ReturnType<typeof getProjectScoringPageData>>["students"] = [];
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const result = await getProjectScoringPageData(supabase, examId);
    data = result.data;
    students = result.students;
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  if (error) {
    return (
      <div>
        <PageHeader icon={FolderCheck} title="Project scoring" breadcrumb={[{ label: "Dashboard", href: "/csa" }]} />
        <div
          className="flex items-start gap-3 rounded-lg border p-5 text-sm"
          style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load this project scoring screen.</p>
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
        icon={FolderCheck}
        title="Project assessment"
        subtitle={`${data.examTitle} · ${data.maxMarks} marks`}
        breadcrumb={[{ label: "Dashboard", href: "/csa" }, { label: "Project assessment" }]}
      />
      <ProjectScoringClient examData={data} initialStudents={students} />
    </div>
  );
}
