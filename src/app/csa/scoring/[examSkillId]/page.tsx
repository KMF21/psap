import { ClipboardCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { examSkills, skills, students, exams } from "@/lib/mock-data";
import { ScoringClient } from "./ScoringClient";

export default async function ScoringPage({ params }: { params: Promise<{ examSkillId: string }> }) {
  const { examSkillId } = await params;
  const examSkill = examSkills.find((es) => es.id === examSkillId);
  if (!examSkill) notFound();

  const skill = skills.find((s) => s.id === examSkill.skillId)!;
  const exam = exams.find((e) => e.id === examSkill.examId)!;

  return (
    <div>
      <PageHeader
        icon={ClipboardCheck}
        title={skill.name}
        subtitle={`${exam.title} · ${examSkill.assignedMarks} marks assigned`}
        breadcrumb={[{ label: "Dashboard", href: "/csa" }, { label: skill.name }]}
      />
      <ScoringClient examSkill={examSkill} skill={skill} students={students} />
    </div>
  );
}
