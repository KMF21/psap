"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { setCsaActive, renameCsa } from "@/lib/supabase/csas";
import { getSessionRole, isAdminSession } from "@/lib/auth";

export interface InviteCsaState {
  error: string | null;
  success: string | null;
}

function cleanName(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export async function inviteCsaAction(_prevState: InviteCsaState, formData: FormData): Promise<InviteCsaState> {
  if (!(await isAdminSession())) {
    return { error: "Only an Admin can invite CSAs.", success: null };
  }

  const fullName = cleanName(formData.get("fullName"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (fullName.length < 2 || fullName.length > 120) {
    return { error: "Enter the CSA's full name.", success: null };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address.", success: null };
  }

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    const client = await clerkClient();
    await client.invitations.createInvitation({
      emailAddress: email,
      // Copied to the user's public_metadata when they accept through the
      // link. If they sign up some other way, ensureRoleFromInvitation
      // (webhook + landing page) applies the same role and name anyway.
      publicMetadata: { role: "csa", fullName },
      // Land on OUR sign-up page with the invitation ticket attached, so
      // Clerk ties the new account to this invitation.
      ...(host ? { redirectUrl: `${proto}://${host}/sign-up` } : {}),
      notify: true,
    });
  } catch (e) {
    const clerkError = e as { errors?: { message?: string; longMessage?: string }[] };
    const message =
      clerkError?.errors?.[0]?.longMessage ??
      clerkError?.errors?.[0]?.message ??
      (e instanceof Error ? e.message : "Failed to send invitation.");
    return { error: message, success: null };
  }

  revalidatePath("/admin/csas");
  return { error: null, success: `Invitation sent to ${fullName} (${email}).` };
}

export async function revokeCsaInvitationAction(invitationId: string): Promise<{ error: string | null }> {
  if (!(await isAdminSession())) return { error: "Only an Admin can revoke invitations." };
  try {
    const client = await clerkClient();
    await client.invitations.revokeInvitation(invitationId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to revoke the invitation." };
  }
  revalidatePath("/admin/csas");
  return { error: null };
}

export async function renameCsaAction(csaUserId: string, rawName: string): Promise<{ error: string | null; fullName?: string }> {
  if (!(await isAdminSession())) return { error: "Only an Admin can rename CSAs." };
  const fullName = cleanName(rawName);
  if (fullName.length < 2 || fullName.length > 120) return { error: "Enter a full name (2–120 characters)." };

  try {
    const supabase = await createServerSupabaseClient();
    const { userId: adminClerkId } = await getSessionRole();
    const { error, clerkUserId, previousName } = await renameCsa(supabase, csaUserId, fullName);
    if (error) return { error };

    // Keep Clerk in step so a later Clerk profile update can't put the old
    // name (or the email) back.
    if (clerkUserId) {
      const client = await clerkClient();
      const user = await client.users.getUser(clerkUserId);
      await client.users.updateUserMetadata(clerkUserId, {
        publicMetadata: { ...(user.publicMetadata ?? {}), fullName },
      });
    }

    const { data: admin } = await supabase.from("users").select("id").eq("clerk_user_id", adminClerkId ?? "").maybeSingle();
    await supabase.from("audit_log").insert({
      entity_type: "user",
      entity_id: csaUserId,
      action: "rename",
      actor_id: admin?.id ?? null,
      previous_value: { full_name: previousName },
      new_value: { full_name: fullName },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error connecting to the database." };
  }
  revalidatePath("/admin/csas");
  return { error: null, fullName };
}

export async function toggleCsaActiveAction(csaUserId: string, isActive: boolean): Promise<{ error: string | null }> {
  if (!(await isAdminSession())) return { error: "Only an Admin can change CSA accounts." };
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await setCsaActive(supabase, csaUserId, isActive);
    if (error) return { error };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error connecting to the database." };
  }
  return { error: null };
}
