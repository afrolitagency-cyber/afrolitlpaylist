"use client";

import { useActionState } from "react";
import { signInArtistAction } from "@/lib/actions/auth";
import type { ActionState } from "@/lib/actions/_result";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";

export function PortalLoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(signInArtistAction, null);

  return (
    <form action={action} className="space-y-4">
      {state && !state.ok ? (
        <p role="alert" className="rounded border border-(--primary)/40 bg-(--primary)/10 p-3 text-sm text-(--primary)">
          {state.error}
        </p>
      ) : null}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-bold">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={field} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-bold">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className={field} />
      </div>
      <button type="submit" disabled={pending}
        className="w-full rounded bg-(--primary) py-3 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
