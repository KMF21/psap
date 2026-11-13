import { clerkClient } from "@clerk/nextjs/server";

/**
 * Why this exists: Clerk only copies an invitation's public_metadata onto
 * the new user when they sign up THROUGH the invitation link. If a CSA
 * signs up any other way (opens the site directly, uses Google, or the
 * link expired and they registered fresh with the same email), the role
 * never arrives and the Admin had to set it by hand in the Clerk
 * dashboard. These helpers close that gap: we look up our own CSA
 * invitation for the user's email and apply the role ourselves.
 */

export interface CsaInvitationInfo {
  invitationId: string;
  email: string;
  fullName: string | null;
  status: string;
  createdAt: number;
}

type InvitationMeta = { role?: string; fullName?: string };

function toInfo(inv: {
  id: string;
  emailAddress: string;
  publicMetadata: unknown;
  status: string;
  createdAt: number;
}): CsaInvitationInfo | null {
  const meta = (inv.publicMetadata ?? {}) as InvitationMeta;
  if (meta.role !== "csa") return null;
  return {
    invitationId: inv.id,
    email: inv.emailAddress,
    fullName: meta.fullName?.trim() || null,
    status: inv.status,
    createdAt: inv.createdAt,
  };
}

/** Our CSA invitation (pending or accepted) for this email, newest first. */
export async function findCsaInvitationForEmail(email: string): Promise<CsaInvitationInfo | null> {
  const client = await clerkClient();
  const { data } = await client.invitations.getInvitationList({ query: email, limit: 20 });
  const wanted = email.trim().toLowerCase();
  const matches = data
    .filter((inv) => inv.emailAddress.toLowerCase() === wanted && (inv.status === "pending" || inv.status === "accepted"))
    .map(toInfo)
    .filter((x): x is CsaInvitationInfo => x !== null)
    .sort((a, b) => b.createdAt - a.createdAt);
  return matches[0] ?? null;
}

/** Invitations sent but not yet accepted, for the Admin's CSA list. */
export async function listPendingCsaInvitations(): Promise<CsaInvitationInfo[]> {
  const client = await clerkClient();
  const { data } = await client.invitations.getInvitationList({ status: "pending", limit: 200 });
  return data
    .map(toInfo)
    .filter((x): x is CsaInvitationInfo => x !== null)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * If this Clerk user has no role yet but was invited as a CSA, give them
 * the CSA role (and the name typed on the invite) in Clerk. Returns the
 * role the user ends up with, or null if they were never invited.
 * Never touches a user who already has a role — an Admin stays an Admin.
 */
export async function ensureRoleFromInvitation(
  clerkUserId: string,
): Promise<{ role: string | null; fullName: string | null; changed: boolean }> {
  const client = await clerkClient();
  const user = await client.users.getUser(clerkUserId);
  const meta = (user.publicMetadata ?? {}) as InvitationMeta;
  if (meta.role) return { role: meta.role, fullName: meta.fullName ?? null, changed: false };

  const emails = user.emailAddresses.map((e) => e.emailAddress);
  for (const email of emails) {
    const invitation = await findCsaInvitationForEmail(email);
    if (!invitation) continue;
    await client.users.updateUserMetadata(clerkUserId, {
      publicMetadata: { ...meta, role: "csa", ...(invitation.fullName ? { fullName: invitation.fullName } : {}) },
    });
    if (invitation.status === "pending") {
      // They're in now; the old link should no longer work.
      await client.invitations.revokeInvitation(invitation.invitationId).catch(() => undefined);
    }
    return { role: "csa", fullName: invitation.fullName, changed: true };
  }
  return { role: null, fullName: null, changed: false };
}
