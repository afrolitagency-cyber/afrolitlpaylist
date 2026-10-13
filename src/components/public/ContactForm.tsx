"use client";

import { useActionState } from "react";
import { sendContactMessage } from "@/lib/actions/public";
import type { ActionState } from "@/lib/actions/_result";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";

export function ContactForm({
  defaultSubject,
  kind,
  bodyPlaceholder = "How can we help?",
}: {
  defaultSubject?: string;
  kind?: string;
  bodyPlaceholder?: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(sendContactMessage, null);

  return (
    <form action={action} className="max-w-xl space-y-3">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {kind ? <input type="hidden" name="kind" value={kind} /> : null}

      {state ? (
        <p role={state.ok ? "status" : "alert"}
          className={`rounded border p-3 text-sm ${state.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
          {state.ok ? state.message : state.error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" required placeholder="Your name" className={field} />
        <input name="email" type="email" required placeholder="Email" className={field} />
      </div>
      <input name="subject" placeholder="Subject" defaultValue={defaultSubject} className={field} />
      <textarea name="body" required rows={6} placeholder={bodyPlaceholder} className={field} />
      <button type="submit" disabled={pending}
        className="rounded bg-(--primary) px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
