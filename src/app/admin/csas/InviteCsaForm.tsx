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
        Sends an email invitation. Once they accept and sign up, their account is automatically synced with CSA
        access — no further setup needed.
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

      <form action={formAction} className="mt-4 flex gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="csa@example.com"
          className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
        />
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          style={{ background: "var(--accent)" }}
        >
          <Send size={14} /> {isPending ? "Sending…" : "Send invite"}
        </button>
      </form>
    </div>
  );
}
