"use client";

import { useState, useTransition } from "react";
import type { CsaAccount } from "@/lib/supabase/csas";
import { toggleCsaActiveAction } from "./actions";

export function CsaAccountsTable({ initialCsas }: { initialCsas: CsaAccount[] }) {
  const [csas, setCsas] = useState(initialCsas);
  const [isPending, startTransition] = useTransition();

  function toggle(csa: CsaAccount) {
    const next = !csa.isActive;
    setCsas((prev) => prev.map((c) => (c.id === csa.id ? { ...c, isActive: next } : c))); // optimistic
    startTransition(async () => {
      const result = await toggleCsaActiveAction(csa.id, next);
      if (result.error) {
        setCsas((prev) => prev.map((c) => (c.id === csa.id ? { ...c, isActive: !next } : c))); // revert
      }
    });
  }

  return (
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
        {csas.map((c) => (
          <tr key={c.id} className="border-b border-border last:border-0">
            <td className="px-5 py-3.5 font-medium text-ink">{c.fullName}</td>
            <td className="px-5 py-3.5 text-ink-muted">{c.email ?? "—"}</td>
            <td className="px-5 py-3.5">
              <span
                className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                style={
                  c.isActive
                    ? { background: "var(--success-soft)", color: "var(--success)" }
                    : { background: "var(--neutral-soft)", color: "var(--ink-muted)" }
                }
              >
                {c.isActive ? "Active" : "Inactive"}
              </span>
            </td>
            <td className="px-5 py-3.5 text-right">
              <button
                onClick={() => toggle(c)}
                disabled={isPending}
                className="text-xs font-medium text-ink-muted hover:text-accent-ink disabled:opacity-50"
              >
                {c.isActive ? "Deactivate" : "Reactivate"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
