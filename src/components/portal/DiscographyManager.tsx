"use client";

import { useActionState, useState } from "react";
import { saveRelease, deleteRelease } from "@/lib/actions/portal";
import type { ActionState } from "@/lib/actions/_result";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";
const label = "mb-1.5 block text-xs font-bold";

export type Release = {
  id: string;
  title: string;
  type: string;
  releaseDate: string;
  coverArt: string;
  streamUrl: string;
  published: boolean;
};

export function DiscographyManager({ artistId, releases }: { artistId: string; releases: Release[] }) {
  const [saveState, save, saving] = useActionState<ActionState, FormData>(saveRelease, null);
  const [delState, remove] = useActionState<ActionState, FormData>(deleteRelease, null);
  const [editing, setEditing] = useState<Release | null>(null);

  const state = saveState ?? delState;

  return (
    <div className="space-y-6">
      {state ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={`rounded border p-3 text-sm ${
            state.ok
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"
          }`}
        >
          {state.ok ? state.message : state.error}
        </p>
      ) : null}

      <form action={save} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
        <input type="hidden" name="artistId" value={artistId} />
        {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
        <h2 className="mb-4 text-[15px] font-bold">{editing ? "Edit release" : "Add a release"}</h2>

        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="title">Title</label>
            <input id="title" name="title" required defaultValue={editing?.title ?? ""} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="type">Type</label>
            <select id="type" name="type" defaultValue={editing?.type ?? "SINGLE"} className={field}>
              <option value="SINGLE">Single</option>
              <option value="EP">EP</option>
              <option value="ALBUM">Album</option>
              <option value="MIXTAPE">Mixtape</option>
            </select>
          </div>
        </div>

        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="releaseDate">Release date</label>
            <input id="releaseDate" name="releaseDate" type="date" defaultValue={editing?.releaseDate ?? ""} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="coverArt">Cover art URL</label>
            <input id="coverArt" name="coverArt" defaultValue={editing?.coverArt ?? ""} className={field} />
          </div>
        </div>

        <div className="mb-4">
          <label className={label} htmlFor="streamUrl">Streaming link</label>
          <input id="streamUrl" name="streamUrl" defaultValue={editing?.streamUrl ?? ""}
            placeholder="https://open.spotify.com/…" className={field} />
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={saving}
            className="rounded bg-(--primary) px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Saving…" : editing ? "Update release" : "Add release"}
          </button>
          {editing ? (
            <button type="button" onClick={() => setEditing(null)}
              className="rounded border border-(--border-strong) px-4 py-2.5 text-sm font-bold">
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-(--border-strong) bg-(--card-bg)">
        {releases.length === 0 ? (
          <p className="p-6 text-sm text-(--sub-text)">No releases yet.</p>
        ) : (
          releases.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 border-b border-(--border-strong) px-5 py-3.5 last:border-0">
              <div className="min-w-0 flex-1">
                <b className="block truncate text-sm">{r.title}</b>
                <span className="text-xs capitalize text-(--sub-text)">
                  {r.type.toLowerCase()}{r.releaseDate ? ` · ${r.releaseDate}` : ""}
                </span>
              </div>
              {!r.published ? (
                <span className="rounded-full bg-(--primary)/15 px-2.5 py-1 text-[11.5px] font-bold text-(--primary)">
                  Unpublished by an editor
                </span>
              ) : null}
              <button type="button" onClick={() => setEditing(r)}
                className="rounded border border-(--border-strong) px-3 py-1.5 text-xs font-bold hover:border-(--primary)">
                Edit
              </button>
              <form action={remove}>
                <input type="hidden" name="id" value={r.id} />
                <button type="submit" className="rounded border border-(--primary)/40 px-3 py-1.5 text-xs font-bold text-(--primary)">
                  Delete
                </button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
