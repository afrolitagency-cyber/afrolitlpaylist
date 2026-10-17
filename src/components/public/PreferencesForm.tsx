"use client";

import { useActionState } from "react";
import { savePreferences } from "@/lib/actions/public";
import type { ActionState } from "@/lib/actions/_result";

export function PreferencesForm({
  s,
  t,
  email,
  firstName,
  wantsBlog,
  wantsEvents,
}: {
  s: string;
  t: string;
  email: string;
  firstName: string;
  wantsBlog: boolean;
  wantsEvents: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(savePreferences, null);

  return (
    <form action={action} className="mx-auto max-w-md space-y-4 text-left">
      <input type="hidden" name="s" value={s} />
      <input type="hidden" name="t" value={t} />
      {state ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={`rounded border p-3 text-sm ${state.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}
        >
          {state.ok ? state.message : state.error}
        </p>
      ) : null}
      <p className="text-sm text-(--sub-text)">{email}</p>
      <div>
        <label className="mb-1.5 block text-xs font-bold" htmlFor="firstName">First name</label>
        <input id="firstName" name="firstName" defaultValue={firstName}
          className="w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="wantsBlog" defaultChecked={wantsBlog} />
        Blog digest
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="wantsEvents" defaultChecked={wantsEvents} />
        Event updates
      </label>
      <button type="submit" disabled={pending}
        className="rounded bg-(--primary) px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}
