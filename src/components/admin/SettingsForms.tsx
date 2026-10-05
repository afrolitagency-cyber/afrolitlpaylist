"use client";

import { useActionState, useState } from "react";
import { setTheme, saveIdentity } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/actions/_result";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";
const label = "mb-1.5 block text-xs font-bold";

function Message({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p role={state.ok ? "status" : "alert"}
      className={`mb-4 rounded border p-3 text-sm ${state.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
      {state.ok ? state.message : state.error}
    </p>
  );
}

export function ThemePicker({
  themes,
  active,
}: {
  themes: { key: string; name: string; description: string }[];
  active: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setTheme, null);
  const [choice, setChoice] = useState(active);

  return (
    <form action={action}>
      <Message state={state} />
      <input type="hidden" name="theme" value={choice} />
      <p className="mb-4 text-sm text-(--sub-text)">
        Switching changes the public site immediately — no redeploy. The admin and portal are unaffected.
      </p>
      <div className="mb-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((t) => (
          <button key={t.key} type="button" onClick={() => setChoice(t.key)}
            className={`rounded-lg border-2 p-4 text-left ${choice === t.key ? "border-(--primary)" : "border-(--border-strong)"}`}>
            <b className="block text-sm">{t.name}</b>
            <span className="mt-1 block text-xs text-(--sub-text)">{t.description}</span>
            {t.key === active ? <span className="mt-2 inline-block text-[11px] font-bold text-(--primary)">Currently live</span> : null}
          </button>
        ))}
      </div>
      <button type="submit" disabled={pending || choice === active}
        className="rounded bg-(--primary) px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Switching…" : "Apply theme"}
      </button>
    </form>
  );
}

export function IdentityForm({
  values,
}: {
  values: { name: string; tagline: string; instagram: string; x: string; youtube: string; tiktok: string };
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveIdentity, null);

  return (
    <form action={action}>
      <Message state={state} />
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="name">Site name</label>
          <input id="name" name="name" defaultValue={values.name} className={field} />
        </div>
        <div>
          <label className={label} htmlFor="tagline">Tagline</label>
          <input id="tagline" name="tagline" defaultValue={values.tagline} className={field} />
        </div>
      </div>
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        {(["instagram", "x", "youtube", "tiktok"] as const).map((k) => (
          <div key={k}>
            <label className={label} htmlFor={k}>{k === "x" ? "X / Twitter" : k}</label>
            <input id={k} name={k} defaultValue={values[k]} placeholder="https://" className={field} />
          </div>
        ))}
      </div>
      <button type="submit" disabled={pending}
        className="rounded bg-(--primary) px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
