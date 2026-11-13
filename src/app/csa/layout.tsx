import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CsaSidebar } from "@/components/layout/CsaSidebar";
import { Footer } from "@/components/ui/Footer";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  // The name the Admin typed (invite or CSA list) beats whatever Clerk has.
  let fullName: string | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("users").select("full_name").eq("clerk_user_id", userId).maybeSingle();
    fullName = data?.full_name && !data.full_name.includes("@") ? data.full_name : null;
  } catch {
    fullName = null;
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <CsaSidebar fullName={fullName} />
      <main className="flex flex-1 flex-col overflow-y-auto pt-14 lg:pt-0">
        <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</div>
        <Footer />
      </main>
    </div>
  );
}
