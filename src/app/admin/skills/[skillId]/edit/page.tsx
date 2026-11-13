import { ListChecks, AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSkillForEdit } from "@/lib/supabase/skills";
import { EditSkillForm } from "./EditSkillForm";

export default async function EditSkillPage({ params }: { params: Promise<{ skillId: string }> }) {
  const { skillId } = await params;
  let result: Awaited<ReturnType<typeof getSkillForEdit>> | null = null;
  let error: string | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    result = await getSkillForEdit(supabase, skillId);
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }
  if (!error && !result?.skill) notFound();

  return (
    <div>
      <PageHeader
        icon={ListChecks}
        title={result?.skill ? `#${result.skill.skillNumber} ${result.skill.name}` : "Edit skill"}
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Skills & rubrics", href: "/admin/skills" }, { label: "Edit skill" }]}
      />
      {error || !result?.skill ? (
        <div className="flex items-start gap-3 rounded-lg border p-5 text-sm" style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}>
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      ) : (
        <EditSkillForm skill={result.skill} usage={result.usage} examTitles={result.examTitles} />
      )}
    </div>
  );
}
