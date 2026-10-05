"use client";

import { useActionState } from "react";
import { subscribe } from "@/lib/actions/public";
import type { ActionState } from "@/lib/actions/_result";

/** Double opt-in signup. The same component serves the sidebar and the
 *  full-width band, so there is one place where subscribe is wired up. */
export function NewsletterSignup({ compact = false }: { compact?: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(subscribe, null);

  return (
    <form action={action} className={compact ? "" : "mx-auto max-w-[520px]"}>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      {state ? (
        <p role={state.ok ? "status" : "alert"}
          className={`mb-3 rounded border p-3 text-sm ${state.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
          {state.ok ? state.message : state.error}
        </p>
      ) : null}

      {!compact ? (
        <p className="mb-4 text-center text-sm text-(--sub-text)">
          New music, event alerts and artist stories — straight to your inbox.
        </p>
      ) : (
        <p className="mb-3 text-[13px] text-(--sub-text)">New music and event alerts, weekly.</p>
      )}

      <div className={compact ? "space-y-2.5" : "flex flex-col gap-2.5 sm:flex-row"}>
        <input name="email" type="email" required placeholder="Email address" aria-label="Email address"
          className="w-full rounded border border-(--border) bg-(--input-bg) p-3.5 text-sm" />
        <button type="submit" disabled={pending}
          className="shrink-0 rounded bg-(--primary) px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Sending…" : "Subscribe"}
        </button>
      </div>

      <p className="mt-2.5 text-xs text-(--sub-text)">
        We&apos;ll email you a confirmation link. Unsubscribe any time.
      </p>
    </form>
  );
}
