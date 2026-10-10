"use client";

import { useActionState } from "react";
import { saveAlbumStyles } from "@/lib/actions/albums";
import type { ActionState } from "@/lib/actions/_result";

const STYLES = [
  { key: "spotlight", label: "Spotlight", sub: "One album on stage, chart beside it" },
  { key: "strip", label: "Strip", sub: "Five square covers in a row" },
] as const;

export function AlbumStyleForm({
  templates,
  styles,
  active,
}: {
  templates: { key: string; name: string }[];
  styles: Record<string, string>;
  active: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveAlbumStyles, null);

  return (
    <form action={action} className="mb-5 rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold">Homepage display</h3>
          <p className="text-xs text-(--sub-text)">Choose the Trending Albums layout for each homepage template.</p>
        </div>
        <button type="submit" disabled={pending}
          className="rounded bg-(--primary) px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save layouts"}
        </button>
      </div>

      {state ? (
        <p role={state.ok ? "status" : "alert"}
          className={`mb-4 rounded border p-3 text-sm ${state.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
          {state.ok ? state.message : state.error}
        </p>
      ) : null}

      <div className="divide-y divide-(--border-strong)">
        {templates.map((t) => (
          <fieldset key={t.key} className="flex flex-wrap items-center gap-3 py-3">
            <legend className="sr-only">{t.name}</legend>
            <span className="min-w-40 flex-1 text-sm font-bold">
              {t.name}
              {t.key === active ? (
                <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-400">live</span>
              ) : null}
            </span>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <label key={s.key} className="cursor-pointer">
                  <input type="radio" name={`style_${t.key}`} value={s.key} defaultChecked={styles[t.key] === s.key} className="peer sr-only" />
                  <span className="block rounded-[10px] border border-(--border-strong) px-3.5 py-2 text-sm peer-checked:border-(--primary) peer-checked:text-(--primary) peer-focus-visible:outline-2 peer-focus-visible:outline-(--primary)">
                    {s.label}
                    <small className="block text-[11px] text-(--sub-text)">{s.sub}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </form>
  );
}
