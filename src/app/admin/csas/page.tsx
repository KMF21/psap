import { UserCog, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCsaAccounts } from "@/lib/supabase/csas";
import { InviteCsaForm } from "./InviteCsaForm";
import { CsaAccountsTable } from "./CsaAccountsTable";
import { listPendingCsaInvitations, type CsaInvitationInfo } from "@/lib/clerk-invitations";

export default async function CsaAccountsPage() {
  let csas: Awaited<ReturnType<typeof getCsaAccounts>>["csas"] = [];
  let invitations: CsaInvitationInfo[] = [];
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const result = await getCsaAccounts(supabase);
    csas = result.csas;
    error = result.error;
    // Pending invites are a convenience view — never block the page on them.
    invitations = await listPendingCsaInvitations().catch(() => []);
    // Someone already signed up: hide their stale invite row.
    const known = new Set(csas.map((c) => (c.email ?? "").toLowerCase()));
    invitations = invitations.filter((i) => !known.has(i.email.toLowerCase()));
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  return (
    <div>
      <PageHeader
        icon={UserCog}
        title="CSA accounts"
        subtitle={
          error
            ? "Unable to load CSA accounts"
            : `${csas.length} CSA account${csas.length !== 1 ? "s" : ""}${invitations.length ? ` · ${invitations.length} invited` : ""}`
        }
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "CSA accounts" }]}
      />

      <div className="space-y-5">
        <InviteCsaForm />

        {error ? (
          <div
            className="flex items-start gap-3 rounded-lg border p-5 text-sm"
            style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", color: "var(--warn)" }}
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Couldn&apos;t load CSA accounts.</p>
              <p className="mt-1 opacity-90">{error}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-surface">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">Existing accounts</h2>
            </div>
            <CsaAccountsTable initialCsas={csas} initialInvitations={invitations} />
          </div>
        )}
      </div>
    </div>
  );
}
