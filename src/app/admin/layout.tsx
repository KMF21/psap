import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

// Resource-based auth check, per Clerk's current guidance — this layout
// protects every page under /admin itself, rather than relying on
// proxy.ts to match the /admin path (see src/proxy.ts for why).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/admin");
  }

  const role = (sessionClaims?.public_metadata as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    redirect(role === "csa" ? "/csa" : "/"); // "/" shows the no-role message if neither matches
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
