"use client";

import { useActionState } from "react";
import { AlertTriangle, CheckCircle2, Send } from "lucide-react";
import { inviteCsaAction, type InviteCsaState } from "./actions";

export function InviteCsaForm() {
  const [state, formAction, isPending] = useActionState<InviteCsaState, FormData>(inviteCsaAction, {
    error: null,
    success: null,
  });

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h3 className="text-sm font-semibold text-ink">Invite a CSA</h3>
      <p className="mt-1 text-xs text-ink-muted">
        Sends an email invitation. The name shows in the list straight away, and the CSA role is applied automatically when they sign up — no Clerk dashboard step needed.
      </p>

      {state.error && (
        <div
          className="mt-3 flex items-start gap-2 rounded-md p-3 text-sm"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state.success && (
        <div
          className="mt-3 flex items-start gap-2 rounded-md p-3 text-sm"
          style={{ background: "var(--success-soft)", color: "var(--success)" }}
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>{state.success}</span>
        </div>
      )}

      <form action={formAction} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <label className="sr-only" htmlFor="csa-full-name">Full name</label>
        <input
          id="csa-full-name"
          name="fullName"
          type="text"
          required
          minLength={2}
          maxLength={120}
          autoComplete="off"
          placeholder="Full name, e.g. Aisha Bello"
          className="rounded-md border border-border bg-bg px-3 py-2.5 text-base text-ink placeholder:text-ink-faint sm:text-sm"
        />
        <label className="sr-only" htmlFor="csa-email">Email</label>
        <input
          id="csa-email"
          name="email"
          type="email"
          required
          autoComplete="off"
          inputMode="email"
          placeholder="csa@example.com"
          className="rounded-md border border-border bg-bg px-3 py-2.5 text-base text-ink placeholder:text-ink-faint sm:text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          style={{ background: "var(--accent)" }}
        >
          <Send size={14} /> {isPending ? "Sending…" : "Send invite"}
        </button>
      </form>
    </div>
  );
}
