import { UserRound, AlertTriangle } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getExamBoard, getMyUserId } from "@/lib/supabase/draws";
import { StudentClient } from "./StudentClient";

export const dynamic = "force-dynamic";

export default async function CsaStudentPage({ params }: { params: Promise<{ examId: string; studentId: string }> }) {
  const { examId, studentId } = await params;
  const { userId } = await auth();

  let board: Awaited<ReturnType<typeof getExamBoard>>["board"] = null;
  let error: string | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    const meId = userId ? await getMyUserId(supabase, userId) : null;
    if (meId) {
      const result = await getExamBoard(supabase, examId, meId);
      board = result.board;
      error = result.error;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }
  const student = board?.students.find((s) => s.id === studentId);
  if (!error && (!board || !student)) notFound();

  return (
    <div>
      <PageHeader
        icon={UserRound}
        title={student?.fullName ?? "Student"}
        subtitle={student ? `${student.registrationNumber}${student.level ? ` · ${student.level}` : ""}` : undefined}
        breadcrumb={[
          { label: "My exams", href: "/csa" },
          { label: board?.title ?? "Exam", href: `/csa/exams/${examId}` },
          { label: student?.fullName ?? "Student" },
        ]}
      />
      {error || !board || !student ? (
        <div className="flex items-start gap-3 rounded-lg border p-5 text-sm" style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}>
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      ) : (
        <StudentClient board={board} student={student} />
      )}
    </div>
  );
}
