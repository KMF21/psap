import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuditEntry {
  id: string;
  entityType: "skill_assessment" | "project_assessment";
  action: "submit" | "admin_edit";
  actorName: string;
  studentName: string | null;
  contextLabel: string | null; // skill name or "Project assessment"
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: string;
}

type RawAuditRow = {
  id: string;
  entity_type: "skill_assessment" | "project_assessment";
  entity_id: string;
  action: "submit" | "admin_edit";
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
  users: { full_name: string } | null;
};

export async function getAuditLog(
  supabase: SupabaseClient,
  limit = 100,
): Promise<{ entries: AuditEntry[]; error: string | null }> {
  const { data: rows, error } = await supabase
    .from("audit_log")
    .select("id, entity_type, entity_id, action, previous_value, new_value, created_at, users(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { entries: [], error: error.message };

  const raw = (rows ?? []) as unknown as RawAuditRow[];
  const skillAssessmentIds = raw.filter((r) => r.entity_type === "skill_assessment").map((r) => r.entity_id);
  const projectAssessmentIds = raw.filter((r) => r.entity_type === "project_assessment").map((r) => r.entity_id);

  const skillContext = new Map<string, { studentName: string; skillName: string }>();
  if (skillAssessmentIds.length > 0) {
    const { data: saRows } = await supabase
      .from("skill_assessments")
      .select("id, students(full_name), exam_skills(skills(name))")
      .in("id", skillAssessmentIds);

    for (const r of (saRows ?? []) as unknown as {
      id: string;
      students: { full_name: string } | null;
      exam_skills: { skills: { name: string } | null } | null;
    }[]) {
      skillContext.set(r.id, {
        studentName: r.students?.full_name ?? "Unknown student",
        skillName: r.exam_skills?.skills?.name ?? "Unknown skill",
      });
    }
  }

  const projectContext = new Map<string, { studentName: string }>();
  if (projectAssessmentIds.length > 0) {
    const { data: paRows } = await supabase
      .from("project_assessments")
      .select("id, students(full_name)")
      .in("id", projectAssessmentIds);

    for (const r of (paRows ?? []) as unknown as { id: string; students: { full_name: string } | null }[]) {
      projectContext.set(r.id, { studentName: r.students?.full_name ?? "Unknown student" });
    }
  }

  const entries: AuditEntry[] = raw.map((r) => {
    if (r.entity_type === "skill_assessment") {
      const ctx = skillContext.get(r.entity_id);
      return {
        id: r.id,
        entityType: r.entity_type,
        action: r.action,
        actorName: r.users?.full_name ?? "Unknown user",
        studentName: ctx?.studentName ?? null,
        contextLabel: ctx?.skillName ?? null,
        previousValue: r.previous_value,
        newValue: r.new_value,
        createdAt: r.created_at,
      };
    }
    const ctx = projectContext.get(r.entity_id);
    return {
      id: r.id,
      entityType: r.entity_type,
      action: r.action,
      actorName: r.users?.full_name ?? "Unknown user",
      studentName: ctx?.studentName ?? null,
      contextLabel: "Project assessment",
      previousValue: r.previous_value,
      newValue: r.new_value,
      createdAt: r.created_at,
    };
  });

  return { entries, error: null };
}
