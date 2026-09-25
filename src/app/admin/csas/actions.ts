"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { setCsaActive } from "@/lib/supabase/csas";

export interface InviteCsaState {
  error: string | null;
  success: string | null;
}

export async function inviteCsaAction(_prevState: InviteCsaState, formData: FormData): Promise<InviteCsaState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address.", success: null };
  }

  try {
    const client = await clerkClient();
    await client.invitations.createInvitation({
      emailAddress: email,
      // Carries through to the user's public_metadata the moment they
      // accept and sign up — our Clerk webhook (user.created) then syncs
      // this role into Supabase automatically, same as any other user.
      publicMetadata: { role: "csa" },
      notify: true,
    });
  } catch (e) {
    // Clerk's SDK throws a structured error with .errors[]; fall back to
    // the generic message for anything else (network issues, etc.)
    const clerkError = e as { errors?: { message?: string }[] };
    const message = clerkError?.errors?.[0]?.message ?? (e instanceof Error ? e.message : "Failed to send invitation.");
    return { error: message, success: null };
  }

  return { error: null, success: `Invitation sent to ${email}.` };
}

export async function toggleCsaActiveAction(csaUserId: string, isActive: boolean): Promise<{ error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await setCsaActive(supabase, csaUserId, isActive);
    if (error) return { error };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error connecting to the database." };
  }
  return { error: null };
}
