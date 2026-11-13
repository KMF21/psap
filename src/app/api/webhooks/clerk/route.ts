import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureRoleFromInvitation } from "@/lib/clerk-invitations";

// This route keeps Supabase's `users` table in sync with Clerk, since our
// RLS policies (current_app_role, current_app_user_id in 001_init.sql) look
// up role/identity from THIS table, keyed by clerk_user_id — not from Clerk
// directly. Configure this URL (https://yourdomain.com/api/webhooks/clerk)
// in the Clerk dashboard under Webhooks, subscribed to user.created and
// user.updated, and copy the signing secret into CLERK_WEBHOOK_SECRET below.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role bypasses RLS — server-only, never expose to the client
);

type ClerkUserEvent = {
  type: string;
  data: {
    id: string;
    email_addresses: { id: string; email_address: string }[];
    primary_email_address_id: string | null;
    first_name: string | null;
    last_name: string | null;
    public_metadata: { role?: string; fullName?: string };
    phone_numbers?: { phone_number: string }[];
  };
};

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "CLERK_WEBHOOK_SECRET not configured" }, { status: 500 });
  }

  const headerList = await headers();
  const svixId = headerList.get("svix-id");
  const svixTimestamp = headerList.get("svix-timestamp");
  const svixSignature = headerList.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  const webhook = new Webhook(webhookSecret);

  let event: ClerkUserEvent;
  try {
    // svix's Webhook.verify() only validates the signature — it throws on
    // a bad one but returns `undefined` on success, it does NOT hand back
    // the parsed payload the way some other webhook libraries do. Treating
    // its return value as the event (the original bug here) meant `event`
    // was always undefined even when the signature check genuinely passed,
    // and every request then crashed on `event.type` below. We verify,
    // then separately parse the already-read body ourselves.
    webhook.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
    event = JSON.parse(body) as ClerkUserEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const { id, email_addresses, primary_email_address_id, first_name, last_name, public_metadata, phone_numbers } =
      event.data;

    const primaryEmail =
      email_addresses.find((e) => e.id === primary_email_address_id)?.email_address ??
      email_addresses[0]?.email_address ??
      null;

    // Invited CSAs who signed up without the invitation link arrive with no
    // role. Apply it from our invitation so the Admin never has to open the
    // Clerk dashboard. (Clerk then fires user.updated, which lands here again
    // with the role present — harmless.)
    let metaRole = public_metadata?.role;
    let inviteName = public_metadata?.fullName?.trim() || null;
    if (!metaRole) {
      try {
        const ensured = await ensureRoleFromInvitation(id);
        metaRole = ensured.role ?? undefined;
        inviteName = inviteName ?? ensured.fullName;
      } catch (e) {
        console.error("Could not apply role from invitation:", e);
      }
    }
    const role = metaRole === "admin" ? "admin" : "csa"; // Supabase row defaults to csa; app access still needs the Clerk role

    // Name priority: a real name already saved in our database (typed by the
    // Admin) > the name typed on the invite > the name on the Clerk profile >
    // the email as a last resort. A saved name is never replaced by an email.
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id, full_name")
      .eq("clerk_user_id", id)
      .maybeSingle();
    const clerkName = [first_name, last_name].filter(Boolean).join(" ").trim() || null;
    const looksLikePlaceholder = (n: string | null | undefined) =>
      !n || n === "Unnamed user" || n.includes("@") || (primaryEmail !== null && n.toLowerCase() === primaryEmail.toLowerCase());
    const savedName = existing && !looksLikePlaceholder(existing.full_name) ? existing.full_name : null;
    const fullName = savedName ?? inviteName ?? clerkName ?? primaryEmail ?? "Unnamed user";

    const row = {
      clerk_user_id: id,
      full_name: fullName,
      role,
      email: primaryEmail,
      phone: phone_numbers?.[0]?.phone_number ?? null,
      // is_active deliberately NOT set here: new rows default to true, and a
      // later user.updated event must never re-activate a deactivated CSA.
    };
    const { error } = existing
      ? await supabaseAdmin.from("users").update({ ...row, updated_at: new Date().toISOString() }).eq("id", existing.id)
      : await supabaseAdmin.from("users").upsert(row, { onConflict: "clerk_user_id" });

    if (error) {
      console.error("Failed to sync Clerk user to Supabase:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (event.type === "user.deleted" && event.data?.id) {
    // Keep the row (assessments and the audit log reference it) but block access.
    const { error } = await supabaseAdmin.from("users").update({ is_active: false }).eq("clerk_user_id", event.data.id);
    if (error) {
      console.error("Failed to deactivate deleted Clerk user:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
