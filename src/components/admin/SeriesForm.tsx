"use client";

import { useActionState, useState } from "react";
import { saveSeries } from "@/lib/actions/events";
import type { ActionState } from "@/lib/actions/_result";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";
const label = "mb-1.5 block text-xs font-bold";

export type SeriesItem = {
  id: string; name: string; slug: string; description: string;
  showInNav: boolean; eventCount: number; nextDate: string;
};

export function SeriesManager({ series }: { series: SeriesItem[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSeries, null);
  const [editing, setEditing] = useState<SeriesItem | null>(null);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="overflow-hidden rounded-xl border border-(--border-strong) bg-(--card-bg)">
        {series.length === 0 ? (
          <p className="p-6 text-sm text-(--sub-text)">No series yet. Create one to group recurring programmes.</p>
        ) : (
          series.map((s) => (
            <div key={s.id} className="flex items-center gap-4 border-b border-(--border-strong) px-5 py-4 last:border-0">
              <div className="min-w-0 flex-1">
                <b className="block text-sm">{s.name}</b>
                <span className="text-xs text-(--sub-text)">{s.description || "—"}</span>
              </div>
              <span className="hidden text-xs text-(--sub-text) sm:block">{s.eventCount} events</span>
              {s.showInNav ? (
                <span className="rounded-full bg-(--primary)/15 px-2.5 py-1 text-[11px] font-bold text-(--primary)">In nav</span>
              ) : null}
              <button type="button" onClick={() => setEditing(s)}
                className="rounded border border-(--border-strong) px-3 py-1.5 text-xs font-bold hover:border-(--primary)">
                Edit
              </button>
            </div>
          ))
        )}
      </div>

      <form action={action} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
        <h3 className="mb-4 text-[15px] font-bold">{editing ? "Edit series" : "New series"}</h3>
        {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

        {state ? (
          <p role={state.ok ? "status" : "alert"}
            className={`mb-4 rounded border p-3 text-sm ${state.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
            {state.ok ? state.message : state.error}
          </p>
        ) : null}

        <div className="mb-4">
          <label className={label} htmlFor="name">Series name</label>
          <input id="name" name="name" required defaultValue={editing?.name ?? ""} className={field} />
        </div>
        <div className="mb-4">
          <label className={label} htmlFor="slug">Slug</label>
          <input id="slug" name="slug" defaultValue={editing?.slug ?? ""} className={field} />
        </div>
        <div className="mb-4">
          <label className={label} htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={3} defaultValue={editing?.description ?? ""} className={field} />
        </div>
        <label className="mb-4 flex items-center justify-between py-2 text-sm">
          <span>Show in site navigation</span>
          <input type="checkbox" name="showInNav" defaultChecked={editing?.showInNav ?? false} className="size-4 accent-(--primary)" />
        </label>
        <p className="mb-4 text-xs text-(--sub-text)">
          With this on, upcoming events in the series become a dropdown under its name — no nav edit, no deploy.
        </p>

        <div className="flex gap-2">
          <button type="submit" disabled={pending}
            className="flex-1 rounded bg-(--primary) py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? "Saving…" : "Save series"}
          </button>
          {editing ? (
            <button type="button" onClick={() => setEditing(null)}
              className="rounded border border-(--border-strong) px-4 text-sm font-bold">Cancel</button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
