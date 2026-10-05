"use client";

import { useActionState } from "react";
import { acceptInviteAction } from "@/lib/actions/portal";
import type { ActionState } from "@/lib/actions/_result";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";
const label = "mb-1.5 block text-xs font-bold";

export function InviteForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(acceptInviteAction, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {state && !state.ok ? (
        <p role="alert" className="rounded border border-(--primary)/40 bg-(--primary)/10 p-3 text-sm text-(--primary)">
          {state.error}
        </p>
      ) : null}

      <div>
        <label className={label}>Email</label>
        <input value={email} readOnly disabled className={`${field} opacity-70`} />
      </div>
      <div>
        <label className={label} htmlFor="name">Your name</label>
        <input id="name" name="name" className={field} />
      </div>
      <div>
        <label className={label} htmlFor="password">
          Password <span className="font-normal text-(--sub-text)">— at least 10 characters</span>
        </label>
        <input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" className={field} />
      </div>
      <div>
        <label className={label} htmlFor="confirm">Confirm password</label>
        <input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" className={field} />
      </div>

      <button type="submit" disabled={pending}
        className="w-full rounded bg-(--primary) py-3 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
