"use client";

import { useActionState } from "react";
import { resendOrderTickets } from "@/lib/actions/tickets";
import type { ActionState } from "@/lib/actions/_result";

export function ResendTicketButton({ reference }: { reference: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(resendOrderTickets, null);
  return (
    <form action={action} className="mt-1">
      <input type="hidden" name="reference" value={reference} />
      <button type="submit" disabled={pending} className="text-xs font-bold underline disabled:opacity-50">
        {pending ? "Sending…" : "Resend tickets"}
      </button>
      {state ? (
        <span className={`ml-2 text-[11px] ${state.ok ? "text-emerald-400" : "text-(--primary)"}`}>
          {state.ok ? state.message : state.error}
        </span>
      ) : null}
    </form>
  );
}
