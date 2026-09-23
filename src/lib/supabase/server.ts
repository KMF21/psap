import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

/**
 * Server-side equivalent of useSupabaseClient — for Server Components,
 * Server Actions, and Route Handlers. Same RLS-authenticated behavior:
 * Postgres sees the real signed-in Clerk user via auth.jwt(), never a
 * generic service-role connection.
 *
 * For the Clerk webhook specifically (src/app/api/webhooks/clerk/route.ts),
 * use SUPABASE_SERVICE_ROLE_KEY directly instead — that route runs with no
 * signed-in user (it's Clerk calling us), so RLS has nothing to check
 * against and the service role is the correct, intentional bypass there.
 */
export async function createServerSupabaseClient() {
  const { getToken } = await auth();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => (await getToken()) ?? null,
    },
  );
}
