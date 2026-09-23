import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export default async function Home() {
  const { userId, sessionClaims } = await auth();

  if (userId) {
    const role = (sessionClaims?.public_metadata as { role?: string } | undefined)?.role;
    redirect(role === "admin" ? "/admin" : role === "csa" ? "/csa" : "/sign-in");
  }

  return (
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
  );
}
