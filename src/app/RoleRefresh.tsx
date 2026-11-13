"use client";

import { useEffect, useState } from "react";
import { useSession } from "@clerk/nextjs";

/**
 * The CSA role was just applied in Clerk, but this browser's session token
 * still carries the old (empty) claims. Force a fresh token, then reload so
 * the server sees the role and routes the user to their workspace.
 */
export function RoleRefresh() {
  const { session, isLoaded } = useSession();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isLoaded || !session) return;
    let cancelled = false;
    // Never loop: if a reload already happened and the role still isn't in
    // the token, stop and ask for a sign-out/sign-in instead.
    const KEY = "psap-role-refresh-attempts";
    let attempts = 0;
    try {
      attempts = Number(sessionStorage.getItem(KEY) ?? "0");
      sessionStorage.setItem(KEY, String(attempts + 1));
    } catch {
      attempts = 0;
    }
    if (attempts >= 2) {
      queueMicrotask(() => setFailed(true));
      return;
    }
    (async () => {
      try {
        await session.reload();
        await session.getToken({ skipCache: true });
        if (!cancelled) window.location.replace("/");
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, session]);

  return (
    <p className="mt-2 text-sm text-ink-muted">
      {failed ? "Your CSA access is ready. Please sign out and sign back in to continue." : "Setting up your CSA access…"}
    </p>
  );
}
