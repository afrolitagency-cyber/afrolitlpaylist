"use client";

import { useActionState } from "react";
import { setAdsPublic } from "@/lib/actions/ads";
import type { ActionState } from "@/lib/actions/_result";

export function AdsVisibilityForm({ visible }: { visible: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setAdsPublic, null);

  return (
    <form action={action} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
      {state ? (
        <p role={state.ok ? "status" : "alert"} className={`mb-3 rounded border p-2.5 text-sm ${state.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
          {state.ok ? state.message : state.error}
        </p>
      ) : null}
      <label className="flex items-center justify-between gap-4 text-sm">
        <span>
          <span className="block font-bold">Show ads on the public site</span>
          <span className="mt-1 block text-xs text-(--sub-text)">
            Off hides every slot for visitors. Creatives stay here for demos — turn this on when you want to walk someone through it.
          </span>
        </span>
        <input type="checkbox" name="visible" defaultChecked={visible} className="size-4 shrink-0 accent-(--primary)" />
      </label>
      <button type="submit" disabled={pending} className="mt-4 rounded bg-(--primary) px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save visibility"}
      </button>
    </form>
  );
}