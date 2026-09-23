import { Users, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStudentsWithEligibility } from "@/lib/supabase/exams";
import { EligibilityForm } from "./EligibilityForm";

export default async function EligibilityPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;

  let students: Awaited<ReturnType<typeof getStudentsWithEligibility>>["students"] = [];
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const result = await getStudentsWithEligibility(supabase, examId);
    students = result.students;
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Manage eligibility"
        subtitle="Select which students can be assessed for this examination"
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Examinations", href: "/admin/exams" },
          { label: "Exam", href: `/admin/exams/${examId}` },
          { label: "Eligibility" },
        ]}
      />

      {error ? (
        <div
          className="flex items-start gap-3 rounded-lg border p-5 text-sm"
          style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load students.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-10 text-center text-sm text-ink-faint">
          No students registered yet. Add students first.
        </div>
      ) : (
        <EligibilityForm examId={examId} students={students} />
      )}
    </div>
  );
}
