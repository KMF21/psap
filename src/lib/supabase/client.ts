"use client";

import { createClient } from "@supabase/supabase-js";
import { useSession } from "@clerk/nextjs";
import { useMemo } from "react";

function assertSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase environment variables are missing. Check that .env.local " +
        "(at your project root, next to package.json) has both " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY set, " +
        "then fully restart the dev server.",
    );
  }
  if (!/^https:\/\/.+\.supabase\.co$/.test(url)) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL doesn't look like a valid Supabase URL: "${url}". ` +
        "It should look like https://your-project-ref.supabase.co with no " +
        "trailing slash and no quotes around it in .env.local.",
    );
  }
}

/**
 * Client-component hook returning a Supabase client authenticated as the
 * current Clerk user. Every request carries Clerk's session token as the
 * Supabase access token, so `auth.jwt()` in Postgres — and therefore
 * current_app_role() / current_app_user_id() and every RLS policy in
 * 001_init.sql — sees the real signed-in user.
 *
 * Not yet used by any page: the Admin/CSA screens still read from
 * src/lib/mock-data.ts. This is the connective piece ready for when that
 * swap happens (technical spec, Week 3+).
 */
export function useSupabaseClient() {
  const { session } = useSession();

  return useMemo(() => {
    assertSupabaseEnv();
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        accessToken: async () => (await session?.getToken()) ?? null,
      },
    );
  }, [session]);
}
