import type { SupabaseClient } from "@supabase/supabase-js";
import type { Skill, SkillStep } from "@/lib/types";

type SkillStepRow = {
  id: string;
  step_order: number;
  description: string;
  max_marks: number;
};

type SkillRow = {
  id: string;
  name: string;
  native_total: number;
  time_allowed_minutes: number | null;
  is_active: boolean;
  skill_steps: SkillStepRow[];
};

function rowToSkill(row: SkillRow): Skill {
  const steps: SkillStep[] = [...row.skill_steps]
    .sort((a, b) => a.step_order - b.step_order)
    .map((s) => ({
      id: s.id,
      skillId: row.id,
      stepOrder: s.step_order,
      description: s.description,
      maxMarks: s.max_marks,
    }));

  return {
    id: row.id,
    name: row.name,
    nativeTotal: row.native_total,
    timeAllowedMinutes: row.time_allowed_minutes ?? 0,
    isActive: row.is_active,
    steps,
  };
}

/** A skill seeded as a placeholder (see 002_seed_skills.sql) awaiting its official rubric from the client. */
export function isPendingRubric(skill: Skill): boolean {
  return skill.steps.length === 1 && /pending/i.test(skill.steps[0].description);
}

export async function getSkills(supabase: SupabaseClient): Promise<{ skills: Skill[]; error: string | null }> {
  const { data, error } = await supabase
    .from("skills")
    .select("id, name, native_total, time_allowed_minutes, is_active, skill_steps(id, step_order, description, max_marks)")
    .order("name", { ascending: true });

  if (error) {
    return { skills: [], error: error.message };
  }
  return { skills: (data ?? []).map((row) => rowToSkill(row as unknown as SkillRow)), error: null };
}
