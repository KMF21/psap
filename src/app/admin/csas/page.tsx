import { UserCog, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCsaAccounts } from "@/lib/supabase/csas";
import { InviteCsaForm } from "./InviteCsaForm";
import { CsaAccountsTable } from "./CsaAccountsTable";

export default async function CsaAccountsPage() {
  let csas: Awaited<ReturnType<typeof getCsaAccounts>>["csas"] = [];
  let error: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const result = await getCsaAccounts(supabase);
    csas = result.csas;
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error connecting to the database.";
  }

  return (
    <div>
      <PageHeader
        icon={UserCog}
        title="CSA accounts"
        subtitle={error ? "Unable to load CSA accounts" : `${csas.length} CSA account${csas.length !== 1 ? "s" : ""}`}
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
            {csas.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-faint">
                No CSA accounts yet. Invite one using the form above.
              </p>
            ) : (
              <CsaAccountsTable initialCsas={csas} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
