import { UserCog, AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStudentById } from "@/lib/supabase/students";
import { EditStudentForm } from "./EditStudentForm";

export default async function EditStudentPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;

  let student: Awaited<ReturnType<typeof getStudentById>>["student"] = null;
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const result = await getStudentById(supabase, studentId);
    student = result.student;
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  if (error) {
    return (
      <div>
        <PageHeader icon={UserCog} title="Edit student" breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Students", href: "/admin/students" }]} />
        <div
          className="flex items-start gap-3 rounded-lg border p-5 text-sm"
          style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load this student.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!student) notFound();

  return (
    <div>
      <PageHeader
        icon={UserCog}
        title={`Edit: ${student.fullName}`}
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Students", href: "/admin/students" },
          { label: "Edit" },
        ]}
      />
      <EditStudentForm student={student} />
    </div>
  );
}
