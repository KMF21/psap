import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CsaSidebar } from "@/components/layout/CsaSidebar";
import { Footer } from "@/components/ui/Footer";

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
      <main className="flex flex-1 flex-col overflow-y-auto pt-14 lg:pt-0">
        <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</div>
        <Footer />
      </main>
    </div>
  );
}
