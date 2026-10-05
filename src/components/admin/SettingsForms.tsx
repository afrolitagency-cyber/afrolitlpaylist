"use client";

import { useActionState, useState } from "react";
import { setTheme, saveIdentity, saveEmbed } from "@/lib/actions/admin";
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

type EmbedRow = { title: string; url: string };

export function EmbedForm({ values }: { values: EmbedRow[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveEmbed, null);
  const [rows, setRows] = useState<EmbedRow[]>(values.length ? values : [{ title: "", url: "" }]);

  function update(index: number, key: keyof EmbedRow, value: string) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  return (
    <form action={action}>
      <Message state={state} />
      <p className="mb-4 text-sm text-(--sub-text)">
        Add a Spotify or YouTube address for each player. They stack in this order on the homepage sidebar. Paste the address or the whole iframe.
      </p>
      <div className="mb-4 space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="rounded-lg border border-(--border-strong) p-3">
            <div className="mb-3">
              <label className={label} htmlFor={`embed-title-${index}`}>Title</label>
              <input id={`embed-title-${index}`} name="title" value={row.title} onChange={(e) => update(index, "title", e.target.value)}
                placeholder="Valentine's Special" className={field} />
            </div>
            <div>
              <label className={label} htmlFor={`embed-url-${index}`}>Player address</label>
              <input id={`embed-url-${index}`} name="url" value={row.url} onChange={(e) => update(index, "url", e.target.value)}
                placeholder="https://open.spotify.com/… or a YouTube embed" className={field} />
            </div>
            {rows.length > 1 ? (
              <button type="button" onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                className="mt-3 text-xs font-bold text-(--primary)">
                Remove
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2.5">
        <button type="button" onClick={() => setRows((current) => [...current, { title: "", url: "" }])}
          className="rounded border border-(--border-strong) px-5 py-2.5 text-sm font-semibold">
          Add another
        </button>
        <button type="submit" disabled={pending}
          className="rounded bg-(--primary) px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save players"}
        </button>
      </div>
    </form>
  );
}
