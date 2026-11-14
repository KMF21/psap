import type { SupabaseClient } from "@supabase/supabase-js";

export interface CsaAccount {
  id: string;
  fullName: string;
  email: string | null;
  isActive: boolean;
}

export async function getCsaAccounts(supabase: SupabaseClient): Promise<{ csas: CsaAccount[]; error: string | null }> {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, is_active")
    .eq("role", "csa")
    .order("full_name", { ascending: true });

  if (error) return { csas: [], error: error.message };

  return {
    csas: (data ?? []).map((r) => ({ id: r.id, fullName: r.full_name, email: r.email, isActive: r.is_active })),
    error: null,
  };
}

export async function setCsaActive(
  supabase: SupabaseClient,
  csaUserId: string,
  isActive: boolean,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("users").update({ is_active: isActive }).eq("id", csaUserId);
  return { error: error?.message ?? null };
}

export async function renameCsa(
  supabase: SupabaseClient,
  csaUserId: string,
  fullName: string,
): Promise<{ error: string | null; clerkUserId: string | null; previousName: string | null }> {
  const { data: current, error: readError } = await supabase
    .from("users")
    .select("full_name, clerk_user_id, role")
    .eq("id", csaUserId)
    .maybeSingle();
  if (readError) return { error: readError.message, clerkUserId: null, previousName: null };
  if (!current || current.role !== "csa") return { error: "That CSA account no longer exists.", clerkUserId: null, previousName: null };

  const { error } = await supabase
    .from("users")
    .update({ full_name: fullName, updated_at: new Date().toISOString() })
    .eq("id", csaUserId);
  return { error: error?.message ?? null, clerkUserId: current.clerk_user_id ?? null, previousName: current.full_name ?? null };
}

/**
 * Permanently removes a CSA account that has no history. Accounts that have
 * scored anyone (or appear in the audit log) must be deactivated instead, so
 * results and the audit trail always keep their author.
 */
export async function getCsaDeletionCheck(
  supabase: SupabaseClient,
  csaUserId: string,
): Promise<{ error: string | null; clerkUserId: string | null; fullName: string | null }> {
  const { data: user, error } = await supabase.from("users").select("full_name, role, clerk_user_id").eq("id", csaUserId).maybeSingle();
  if (error) return { error: error.message, clerkUserId: null, fullName: null };
  if (!user || user.role !== "csa") return { error: "That CSA account no longer exists.", clerkUserId: null, fullName: null };

  const [skills, projects, audit] = await Promise.all([
    supabase.from("skill_assessments").select("*", { count: "exact", head: true }).eq("csa_id", csaUserId),
    supabase.from("project_assessments").select("*", { count: "exact", head: true }).eq("csa_id", csaUserId),
    supabase.from("audit_log").select("*", { count: "exact", head: true }).eq("actor_id", csaUserId),
  ]);
  const history = (skills.count ?? 0) + (projects.count ?? 0) + (audit.count ?? 0);
  if (history > 0) {
    return {
      error: `${user.full_name} has scoring history, so the account can't be deleted — deactivate it instead to block access while keeping results intact.`,
      clerkUserId: null,
      fullName: user.full_name,
    };
  }
  return { error: null, clerkUserId: user.clerk_user_id ?? null, fullName: user.full_name };
}

export async function deleteCsaRow(supabase: SupabaseClient, csaUserId: string): Promise<{ error: string | null }> {
  const { error: rosterError } = await supabase.from("exam_csas").delete().eq("csa_id", csaUserId);
  if (rosterError) return { error: rosterError.message };
  const { error } = await supabase.from("users").delete().eq("id", csaUserId).eq("role", "csa");
  if (error) {
    if (error.code === "23503") return { error: "This account is still referenced by other records, so it can't be deleted. Deactivate it instead." };
    return { error: error.message };
  }
  return { error: null };
}
