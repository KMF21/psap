import { ClipboardCheck, AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getScoringPageData } from "@/lib/supabase/scoring";
import { ScoringClient } from "./ScoringClient";

export default async function ScoringPage({ params }: { params: Promise<{ examSkillId: string }> }) {
  const { examSkillId } = await params;

  let examSkill: Awaited<ReturnType<typeof getScoringPageData>>["examSkill"] = null;
  let students: Awaited<ReturnType<typeof getScoringPageData>>["students"] = [];
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const result = await getScoringPageData(supabase, examSkillId);
    examSkill = result.examSkill;
    students = result.students;
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  if (error) {
    return (
      <div>
        <PageHeader icon={ClipboardCheck} title="Scoring" breadcrumb={[{ label: "Dashboard", href: "/csa" }]} />
        <div
          className="flex items-start gap-3 rounded-lg border p-5 text-sm"
          style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t load this scoring screen.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!examSkill) notFound();

  return (
    <div>
      <PageHeader
        icon={ClipboardCheck}
        title={examSkill.skillName}
        subtitle={`${examSkill.examTitle} · ${examSkill.assignedMarks} marks assigned`}
        breadcrumb={[{ label: "Dashboard", href: "/csa" }, { label: examSkill.skillName }]}
      />
      <ScoringClient examSkill={examSkill} initialStudents={students} />
    </div>
  );
}
