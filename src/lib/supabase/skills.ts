import type { SupabaseClient } from "@supabase/supabase-js";
import type { Skill, SkillStep } from "@/lib/types";
import { fetchAll } from "./paging";

type SkillStepRow = {
  id: string;
  step_order: number;
  description: string;
  max_marks: number;
};

type SkillRow = {
  id: string;
  skill_number: number;
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
    skillNumber: row.skill_number,
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

export async function createSkillWithSteps(
  supabase: SupabaseClient,
  input: { name: string; timeAllowedMinutes: number; steps: { description: string; maxMarks: number }[] },
): Promise<{ skillId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc("create_skill_with_steps", {
    p_name: input.name,
    p_time_allowed_minutes: input.timeAllowedMinutes,
    p_steps: input.steps.map((s) => ({ description: s.description, maxMarks: s.maxMarks })),
  });

  if (error) {
    return { skillId: null, error: error.message };
  }
  return { skillId: data as string, error: null };
}

export async function getSkills(supabase: SupabaseClient): Promise<{ skills: Skill[]; error: string | null }> {
  const { data, error } = await supabase
    .from("skills")
    .select("id, skill_number, name, native_total, time_allowed_minutes, is_active, skill_steps(id, step_order, description, max_marks)")
    .order("skill_number", { ascending: true });

  if (error) {
    return { skills: [], error: error.message };
  }
  return { skills: (data ?? []).map((row) => rowToSkill(row as unknown as SkillRow)), error: null };
}

// ---------------- Usage, edit and delete ----------------

export interface SkillUsage {
  examCount: number; // exams this skill is on
  scoreCount: number; // assessments recorded against it in any exam
}

export async function getSkillUsage(supabase: SupabaseClient): Promise<Map<string, SkillUsage>> {
  const usage = new Map<string, SkillUsage>();
  const { data: es } = await supabase.from("exam_skills").select("id, skill_id");
  const skillByExamSkill = new Map<string, string>();
  for (const r of es ?? []) {
    skillByExamSkill.set(r.id, r.skill_id);
    const u = usage.get(r.skill_id) ?? { examCount: 0, scoreCount: 0 };
    u.examCount += 1;
    usage.set(r.skill_id, u);
  }
  const { data: scored } = await fetchAll<{ exam_skill_id: string }>((from, to) =>
    supabase.from("skill_assessments").select("exam_skill_id").order("id").range(from, to),
  );
  for (const r of scored) {
    const skillId = skillByExamSkill.get(r.exam_skill_id);
    if (!skillId) continue;
    const u = usage.get(skillId) ?? { examCount: 0, scoreCount: 0 };
    u.scoreCount += 1;
    usage.set(skillId, u);
  }
  return usage;
}

export async function getSkillForEdit(
  supabase: SupabaseClient,
  skillId: string,
): Promise<{ skill: Skill | null; usage: SkillUsage; examTitles: string[]; error: string | null }> {
  const empty = { examCount: 0, scoreCount: 0 };
  const { data, error } = await supabase
    .from("skills")
    .select("id, skill_number, name, native_total, time_allowed_minutes, is_active, skill_steps(id, step_order, description, max_marks)")
    .eq("id", skillId)
    .maybeSingle();
  if (error) return { skill: null, usage: empty, examTitles: [], error: error.message };
  if (!data) return { skill: null, usage: empty, examTitles: [], error: null };

  const { data: es } = await supabase.from("exam_skills").select("id, exams(title)").eq("skill_id", skillId);
  const esRows = (es ?? []) as unknown as { id: string; exams: { title: string } | null }[];
  let scoreCount = 0;
  if (esRows.length > 0) {
    const { count } = await supabase
      .from("skill_assessments")
      .select("*", { count: "exact", head: true })
      .in("exam_skill_id", esRows.map((r) => r.id));
    scoreCount = count ?? 0;
  }
  return {
    skill: rowToSkill(data as unknown as SkillRow),
    usage: { examCount: esRows.length, scoreCount },
    examTitles: esRows.map((r) => r.exams?.title ?? "Untitled exam"),
    error: null,
  };
}

/**
 * Saves a skill's details and rubric. Once scores exist the database only
 * allows wording/order changes to steps (rubric lock), so the caller sends
 * marks unchanged in that case; any attempt otherwise is refused by the DB.
 */
export async function updateSkill(
  supabase: SupabaseClient,
  skillId: string,
  input: {
    name: string;
    skillNumber: number;
    timeAllowedMinutes: number;
    steps: { id: string | null; description: string; maxMarks: number }[];
  },
): Promise<{ error: string | null }> {
  const { error: skillError } = await supabase
    .from("skills")
    .update({ name: input.name, skill_number: input.skillNumber, time_allowed_minutes: input.timeAllowedMinutes, updated_at: new Date().toISOString() })
    .eq("id", skillId);
  if (skillError) {
    if (skillError.message.includes("skills_skill_number_unique")) return { error: "Another skill already has that number." };
    return { error: skillError.message };
  }

  const { data: existing, error: readError } = await supabase.from("skill_steps").select("id, step_order, description, max_marks").eq("skill_id", skillId);
  if (readError) return { error: readError.message };
  const keep = new Set(input.steps.map((s) => s.id).filter((id): id is string => Boolean(id)));
  const toDelete = (existing ?? []).filter((s) => !keep.has(s.id)).map((s) => s.id as string);
  if (toDelete.length > 0) {
    const { error } = await supabase.from("skill_steps").delete().in("id", toDelete);
    if (error) return { error: error.message };
  }

  for (const [index, step] of input.steps.entries()) {
    const values = { step_order: index + 1, description: step.description, max_marks: step.maxMarks };
    if (step.id) {
      const before = (existing ?? []).find((e) => e.id === step.id);
      if (before && before.step_order === index + 1 && before.description === step.description && Number(before.max_marks) === step.maxMarks) continue;
      const { error } = await supabase.from("skill_steps").update(values).eq("id", step.id).eq("skill_id", skillId);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("skill_steps").insert({ ...values, skill_id: skillId });
      if (error) return { error: error.message };
    }
  }
  return { error: null };
}

/** Deletes a skill from the library — only when no exam uses it. */
export async function deleteSkill(supabase: SupabaseClient, skillId: string, adminUserId: string): Promise<{ error: string | null }> {
  const { count } = await supabase.from("exam_skills").select("*", { count: "exact", head: true }).eq("skill_id", skillId);
  if ((count ?? 0) > 0) return { error: "This skill is part of an exam. Remove it from every exam first." };
  const { data: skill } = await supabase.from("skills").select("name, skill_number, native_total").eq("id", skillId).maybeSingle();
  const { error } = await supabase.from("skills").delete().eq("id", skillId);
  if (error) {
    if (error.code === "23503") return { error: "This skill is still referenced elsewhere and can't be deleted." };
    return { error: error.message };
  }
  await supabase.from("audit_log").insert({
    entity_type: "skill",
    entity_id: skillId,
    action: "delete_skill",
    actor_id: adminUserId,
    previous_value: skill ? { skill: skill.name, number: skill.skill_number, native_total: skill.native_total } : null,
  });
  return { error: null };
}
