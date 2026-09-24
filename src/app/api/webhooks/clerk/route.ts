import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    public_metadata: { role?: string };
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

    const role = public_metadata?.role === "admin" ? "admin" : "csa"; // defaults new users to csa until Admin sets them explicitly

    const { error } = await supabaseAdmin.from("users").upsert(
      {
        clerk_user_id: id,
        full_name: [first_name, last_name].filter(Boolean).join(" ") || primaryEmail || "Unnamed user",
        role,
        email: primaryEmail,
        phone: phone_numbers?.[0]?.phone_number ?? null,
        is_active: true,
      },
      { onConflict: "clerk_user_id" },
    );

    if (error) {
      console.error("Failed to sync Clerk user to Supabase:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}