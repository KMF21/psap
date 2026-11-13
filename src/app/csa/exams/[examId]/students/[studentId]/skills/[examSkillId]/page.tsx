import { ClipboardCheck, AlertTriangle, Lock } from "lucide-react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMyUserId, getSkillScoringData } from "@/lib/supabase/draws";
import { ScoreClient } from "./ScoreClient";
import { StartButton } from "./StartButton";

export const dynamic = "force-dynamic";

export default async function CsaScoreSkillPage({ params }: { params: Promise<{ examId: string; studentId: string; examSkillId: string }> }) {
  const { examId, studentId, examSkillId } = await params;
  const { userId } = await auth();

  let data: Awaited<ReturnType<typeof getSkillScoringData>>["data"] = null;
  let error: string | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    const meId = userId ? await getMyUserId(supabase, userId) : null;
    if (meId) {
      const { data: onExam } = await supabase.from("exam_csas").select("id").eq("exam_id", examId).eq("csa_id", meId).maybeSingle();
      if (onExam) {
        const result = await getSkillScoringData(supabase, { examId, studentId, examSkillId, meId });
        data = result.data;
        error = result.error;
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }
  if (!error && !data) notFound();

  const back = `/csa/exams/${examId}/students/${studentId}`;
  const slot = data ? (data.isCompulsory ? "Compulsory" : `Paper #${data.paperNumber}`) : "";

  return (
    <div>
      <PageHeader
        icon={ClipboardCheck}
        title={data?.skillName ?? "Skill"}
        subtitle={data ? `${slot} · ${data.student.fullName} · ${data.student.registrationNumber}` : undefined}
        breadcrumb={[
          { label: "My exams", href: "/csa" },
          { label: data?.examTitle ?? "Exam", href: `/csa/exams/${examId}` },
          { label: data?.student.fullName ?? "Student", href: back },
          { label: slot || "Skill" },
        ]}
      />
      {error || !data ? (
        <div className="flex items-start gap-3 rounded-lg border p-5 text-sm" style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}>
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      ) : data.assessment ? (
        <ScoreClient data={data} backHref={back} />
      ) : data.heldBy ? (
        <div className="space-y-3">
          <p className="flex items-start gap-2 rounded-lg p-4 text-sm" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
            <Lock size={16} className="mt-0.5 shrink-0" /> {data.heldBy} is already scoring this skill for {data.student.fullName}.
          </p>
          <Link href={back} className="block rounded-md border border-border py-3 text-center text-sm font-medium text-ink">← Back to student</Link>
        </div>
      ) : (
        <StartButton examId={examId} studentId={studentId} examSkillId={examSkillId} disabled={data.examStatus !== "open"} skillName={data.skillName} backHref={back} />
      )}
    </div>
  );
}
