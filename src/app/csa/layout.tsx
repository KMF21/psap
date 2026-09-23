import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CsaSidebar } from "@/components/layout/CsaSidebar";

// Resource-based auth check, per Clerk's current guidance — see
// src/app/admin/layout.tsx and src/proxy.ts for the full explanation.
export default async function CsaLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/csa");
  }

  const role = (sessionClaims?.public_metadata as { role?: string } | undefined)?.role;
  if (role !== "csa") {
    redirect(role === "admin" ? "/admin" : "/");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <CsaSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
