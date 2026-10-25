import { auth } from "@clerk/nextjs/server";

/** Role from the Clerk session token (public_metadata.role). */
export async function getSessionRole(): Promise<{ userId: string | null; role: string | null }> {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.public_metadata as { role?: string } | undefined)?.role ?? null;
  return { userId, role };
}

/**
 * Server Actions are public HTTP endpoints — layouts only guard page renders,
 * not direct action calls. Actions that use privileged APIs (e.g. the Clerk
 * backend) must check the role themselves.
 */
export async function isAdminSession(): Promise<boolean> {
  const { userId, role } = await getSessionRole();
  return Boolean(userId) && role === "admin";
}
