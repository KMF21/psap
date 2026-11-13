"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, X } from "lucide-react";
import type { CsaAccount } from "@/lib/supabase/csas";
import type { CsaInvitationInfo } from "@/lib/clerk-invitations";
import { renameCsaAction, revokeCsaInvitationAction, toggleCsaActiveAction } from "./actions";

function Pill({ tone, children }: { tone: "success" | "neutral" | "warn"; children: React.ReactNode }) {
  const style =
    tone === "success"
      ? { background: "var(--success-soft)", color: "var(--success)" }
      : tone === "warn"
        ? { background: "var(--warn-soft)", color: "var(--warn)" }
        : { background: "var(--neutral-soft)", color: "var(--ink-muted)" };
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium" style={style}>
      {children}
    </span>
  );
}

function NameCell({ csa, onSaved }: { csa: CsaAccount; onSaved: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(csa.fullName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await renameCsaAction(csa.id, value);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved(result.fullName ?? value);
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-medium text-ink">{csa.fullName}</span>
        <button
          type="button"
          onClick={() => {
            setValue(csa.fullName);
            setEditing(true);
          }}
          className="shrink-0 rounded p-1.5 text-ink-faint hover:bg-bg hover:text-accent-ink"
          aria-label={`Edit name for ${csa.fullName}`}
          title="Edit name"
        >
          <Pencil size={13} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <form
        className="flex items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={120}
          aria-label="Full name"
          className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2.5 py-1.5 text-base text-ink sm:text-sm"
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md p-2 text-white disabled:opacity-60"
          style={{ background: "var(--accent)" }}
          aria-label="Save name"
        >
          <Check size={14} />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md border border-border p-2 text-ink-muted"
          aria-label="Cancel"
        >
          <X size={14} />
        </button>
      </form>
      {error && <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}

export function CsaAccountsTable({
  initialCsas,
  initialInvitations,
}: {
  initialCsas: CsaAccount[];
  initialInvitations: CsaInvitationInfo[];
}) {
  const [csas, setCsas] = useState(initialCsas);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(csa: CsaAccount) {
    const next = !csa.isActive;
    setCsas((prev) => prev.map((c) => (c.id === csa.id ? { ...c, isActive: next } : c))); // optimistic
    startTransition(async () => {
      const result = await toggleCsaActiveAction(csa.id, next);
      if (result.error) {
        setError(result.error);
        setCsas((prev) => prev.map((c) => (c.id === csa.id ? { ...c, isActive: !next } : c))); // revert
      }
    });
  }

  function revoke(inv: CsaInvitationInfo) {
    if (!window.confirm(`Revoke the invitation for ${inv.fullName ?? inv.email}? The link in their email will stop working.`)) return;
    startTransition(async () => {
      const result = await revokeCsaInvitationAction(inv.invitationId);
      if (result.error) setError(result.error);
      else setInvitations((prev) => prev.filter((i) => i.invitationId !== inv.invitationId));
    });
  }

  function rename(id: string, fullName: string) {
    setCsas((prev) => prev.map((c) => (c.id === id ? { ...c, fullName } : c)));
  }

  if (csas.length === 0 && invitations.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-ink-faint">No CSA accounts yet. Invite one using the form above.</p>
    );
  }

  return (
    <div>
      {error && (
        <p className="mx-5 mt-4 rounded-md p-3 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {/* Phones: one card per person */}
      <ul className="divide-y divide-border sm:hidden">
        {invitations.map((inv) => (
          <li key={inv.invitationId} className="flex items-start justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{inv.fullName ?? "—"}</p>
              <p className="truncate text-xs text-ink-muted">{inv.email}</p>
              <div className="mt-1.5"><Pill tone="warn">Invited</Pill></div>
            </div>
            <button onClick={() => revoke(inv)} disabled={isPending} className="shrink-0 py-1 text-xs font-medium text-ink-muted disabled:opacity-50">
              Revoke
            </button>
          </li>
        ))}
        {csas.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <NameCell csa={c} onSaved={(n) => rename(c.id, n)} />
              <p className="truncate text-xs text-ink-muted">{c.email ?? "—"}</p>
              <div className="mt-1.5"><Pill tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "Active" : "Inactive"}</Pill></div>
            </div>
            <button onClick={() => toggle(c)} disabled={isPending} className="shrink-0 py-1 text-xs font-medium text-ink-muted disabled:opacity-50">
              {c.isActive ? "Deactivate" : "Reactivate"}
            </button>
          </li>
        ))}
      </ul>

      {/* Tablet / desktop */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-ink-faint">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {invitations.map((inv) => (
              <tr key={inv.invitationId} className="border-b border-border">
                <td className="px-5 py-3.5 font-medium text-ink">{inv.fullName ?? "—"}</td>
                <td className="px-5 py-3.5 text-ink-muted">{inv.email}</td>
                <td className="px-5 py-3.5"><Pill tone="warn">Invited</Pill></td>
                <td className="px-5 py-3.5 text-right">
                  <button onClick={() => revoke(inv)} disabled={isPending} className="text-xs font-medium text-ink-muted hover:text-accent-ink disabled:opacity-50">
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
            {csas.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="max-w-[18rem] px-5 py-3.5"><NameCell csa={c} onSaved={(n) => rename(c.id, n)} /></td>
                <td className="px-5 py-3.5 text-ink-muted">{c.email ?? "—"}</td>
                <td className="px-5 py-3.5"><Pill tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "Active" : "Inactive"}</Pill></td>
                <td className="px-5 py-3.5 text-right">
                  <button onClick={() => toggle(c)} disabled={isPending} className="text-xs font-medium text-ink-muted hover:text-accent-ink disabled:opacity-50">
                    {c.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
