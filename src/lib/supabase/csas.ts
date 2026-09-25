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
