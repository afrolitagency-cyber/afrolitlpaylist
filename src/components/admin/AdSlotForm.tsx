"use client";

import { useActionState } from "react";
import { saveAdSlot } from "@/lib/actions/ads";
import type { ActionState } from "@/lib/actions/_result";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";

export function AdSlotForm({
  placement,
  enabled,
  fillMode,
  networkCode,
  disabledOn,
}: {
  placement: string;
  enabled: boolean;
  fillMode: string;
  networkCode: string | null;
  disabledOn: string[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveAdSlot, null);

  return (
    <form action={action} className="mb-4 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="placement" value={placement} />
      {state ? (
        <p role={state.ok ? "status" : "alert"} className={`sm:col-span-2 rounded border p-2.5 text-sm ${state.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
          {state.ok ? state.message : state.error}
        </p>
      ) : null}
      <label className="flex items-center justify-between text-sm sm:col-span-2">
        <span>Enabled</span>
        <input type="checkbox" name="enabled" defaultChecked={enabled} className="size-4 accent-(--primary)" />
      </label>
      <div>
        <label className="mb-1.5 block text-xs font-bold" htmlFor={`mode-${placement}`}>Fill order</label>
        <select id={`mode-${placement}`} name="fillMode" defaultValue={fillMode} className={field}>
          <option value="DIRECT_ONLY">Direct sold only</option>
          <option value="DIRECT_THEN_NETWORK">Direct, then network</option>
          <option value="NETWORK_ONLY">Network only</option>
          <option value="HOUSE_ONLY">House ads only</option>
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-bold" htmlFor={`net-${placement}`}>Network unit id</label>
        <input id={`net-${placement}`} name="networkCode" defaultValue={networkCode ?? ""} placeholder="AdSense data-ad-slot" className={field} />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-xs font-bold" htmlFor={`off-${placement}`}>Hide on paths</label>
        <textarea id={`off-${placement}`} name="disabledOn" rows={2} defaultValue={disabledOn.join("\n")} className={field} />
        <p className="mt-1 text-xs text-(--sub-text)">One prefix per line. Default hides ads on artist profiles.</p>
      </div>
      <button type="submit" disabled={pending} className="rounded bg-(--primary) px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save slot"}
      </button>
    </form>
  );
}
