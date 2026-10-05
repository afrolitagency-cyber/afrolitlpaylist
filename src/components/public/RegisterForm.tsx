"use client";

import { useActionState } from "react";
import { registerForEvent } from "@/lib/actions/registration";
import type { ActionState } from "@/lib/actions/_result";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";

export function RegisterForm({ eventId, spotsLeft }: { eventId: string; spotsLeft: number | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(registerForEvent, null);

  if (state?.ok) {
    return (
      <p role="status" className="rounded border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-sm text-emerald-400">
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-2.5">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      {state && !state.ok ? (
        <p role="alert" className="rounded border border-(--primary)/40 bg-(--primary)/10 p-3 text-sm text-(--primary)">
          {state.error}
        </p>
      ) : null}

      <input name="name" required placeholder="Your name" aria-label="Your name" className={field} />
      <input name="email" type="email" required placeholder="Email" aria-label="Email" className={field} />
      <button type="submit" disabled={pending}
        className="w-full rounded bg-(--primary) py-3 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Registering…" : "Register"}
      </button>
      {spotsLeft !== null && spotsLeft <= 20 ? (
        <p className="text-xs text-(--sub-text)">{spotsLeft} {spotsLeft === 1 ? "place" : "places"} left.</p>
      ) : null}
    </form>
  );
}
