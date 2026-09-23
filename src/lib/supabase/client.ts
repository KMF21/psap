"use client";

import { createClient } from "@supabase/supabase-js";
import { useSession } from "@clerk/nextjs";
import { useMemo } from "react";

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

  return useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          accessToken: async () => (await session?.getToken()) ?? null,
        },
      ),
    [session],
  );
}
