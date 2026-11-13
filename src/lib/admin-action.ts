import type { SupabaseClient } from "@supabase/supabase-js";
import { getSessionRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Every Admin Server Action starts here. Server Actions are public HTTP
 * endpoints, so the Admin role is checked explicitly on every call (RLS
 * still applies underneath as a second line of defence).
 */
export async function adminContext(): Promise<
  { ok: true; supabase: SupabaseClient; adminUserId: string } | { ok: false; error: string }
> {
  const { userId, role } = await getSessionRole();
  if (!userId || role !== "admin") return { ok: false, error: "Only an Admin can do this." };
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("users").select("id").eq("clerk_user_id", userId).maybeSingle();
    if (!data) return { ok: false, error: "Your Admin account isn't set up in the database yet." };
    return { ok: true, supabase, adminUserId: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error connecting to the database." };
  }
}

/** Same idea for CSA actions: signed in as a CSA, and resolved to our user row. */
export async function csaContext(): Promise<
  { ok: true; supabase: SupabaseClient; meId: string } | { ok: false; error: string }
> {
  const { userId, role } = await getSessionRole();
  if (!userId || role !== "csa") return { ok: false, error: "Only a CSA can do this." };
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("users").select("id, is_active").eq("clerk_user_id", userId).maybeSingle();
    if (!data) return { ok: false, error: "Your account isn't set up in the database yet. Ask the Admin." };
    if (!data.is_active) return { ok: false, error: "Your CSA account has been deactivated. Ask the Admin." };
    return { ok: true, supabase, meId: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error connecting to the database." };
  }
}
