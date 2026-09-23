import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { Footer } from "@/components/ui/Footer";

export default async function Home() {
  const { userId, sessionClaims } = await auth();

  if (userId) {
    const role = (sessionClaims?.public_metadata as { role?: string } | undefined)?.role;

    if (role === "admin") redirect("/admin");
    if (role === "csa") redirect("/csa");

    // Signed in, but no recognized role yet — show this instead of bouncing
    // back to /sign-in. Redirecting an already-authenticated user to the
    // sign-in page creates a loop: Clerk sees them as signed in and sends
    // them right back out. This screen breaks that loop and tells the
    // person (or you, while testing) exactly what to fix.
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center bg-bg px-6">
          <div className="w-full max-w-md text-center">
            <div
              className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: "var(--warn-soft)" }}
            >
              <AlertTriangle size={22} style={{ color: "var(--warn)" }} />
            </div>
            <h1 className="text-xl font-semibold text-ink">No role assigned yet</h1>
            <p className="mt-2 text-sm text-ink-muted">
              You&apos;re signed in, but this account has no Admin or CSA role set. An
              administrator needs to set your role in Clerk (Users → your account →
              Public metadata → <code className="text-xs">{"{ \"role\": \"admin\" }"}</code> or{" "}
              <code className="text-xs">{"{ \"role\": \"csa\" }"}</code>), then you&apos;ll need to
              sign out and back in for it to take effect.
            </p>
            <div className="mt-6">
              <SignOutButton>
                <button className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-ink hover:bg-surface">
                  Sign out
                </button>
              </SignOutButton>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 items-center justify-center bg-bg px-6">
        <div className="w-full max-w-md text-center">
          <div
            className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white"
            style={{ background: "var(--accent)" }}
          >
            P
          </div>
          <h1 className="text-2xl font-semibold text-ink">Practical Skills Assessment Portal</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Sign in to continue to your Admin or CSA workspace.
          </p>

          <Link
            href="/sign-in"
            className="mt-8 flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-medium text-white"
            style={{ background: "var(--accent)" }}
          >
            <ShieldCheck size={16} />
            Sign in
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
