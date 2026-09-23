import { ClipboardList, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSkillOptions, getCsaOptions } from "@/lib/supabase/exams";
import { AddSkillForm } from "./AddSkillForm";

export default async function AddSkillToExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;

  let skills: Awaited<ReturnType<typeof getSkillOptions>> = [];
  let csas: Awaited<ReturnType<typeof getCsaOptions>> = [];
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    [skills, csas] = await Promise.all([getSkillOptions(supabase), getCsaOptions(supabase)]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  return (
    <div>
      <PageHeader
        icon={ClipboardList}
        title="Add skill to examination"
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Examinations", href: "/admin/exams" },
          { label: "Exam", href: `/admin/exams/${examId}` },
          { label: "Add skill" },
        ]}
      />

      {error ? (
        <div
          className="flex items-start gap-3 rounded-lg border p-5 text-sm"
          style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load skills and CSAs.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      ) : (
        <AddSkillForm examId={examId} skills={skills} csas={csas} />
      )}
    </div>
  );
}
