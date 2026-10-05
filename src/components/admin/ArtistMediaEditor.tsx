"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { saveMoment, deleteMoment, saveStory, deleteStory } from "@/lib/actions/artistMedia";
import type { ActionState } from "@/lib/actions/_result";
import { UploadField } from "@/components/ui/UploadField";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";
const label = "mb-1.5 block text-xs font-bold";

export type MomentItem = { id: string; mediaUrl: string; caption: string; position: number };
export type StoryItem = { id: string; title: string; coverImage: string; bodyText: string; published: boolean };

function Note({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p role={state.ok ? "status" : "alert"}
      className={`mb-4 rounded border p-3 text-sm ${state.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
      {state.ok ? state.message : state.error}
    </p>
  );
}

export function ArtistMediaEditor({
  artistId, moments, stories,
}: {
  artistId: string; moments: MomentItem[]; stories: StoryItem[];
}) {
  const [mState, saveM, savingM] = useActionState<ActionState, FormData>(saveMoment, null);
  const [, removeM] = useActionState<ActionState, FormData>(deleteMoment, null);
  const [sState, saveS, savingS] = useActionState<ActionState, FormData>(saveStory, null);
  const [, removeS] = useActionState<ActionState, FormData>(deleteStory, null);
  const [editingStory, setEditingStory] = useState<StoryItem | null>(null);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-1 text-lg font-bold">Moments</h2>
        <p className="mb-4 text-sm text-(--sub-text)">
          Editor-curated only — artists cannot add or change these from their portal.
        </p>
        <Note state={mState} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-4 sm:grid-cols-3">
            {moments.length === 0 ? (
              <p className="col-span-full rounded-xl border border-dashed border-(--border-strong) p-6 text-sm text-(--sub-text)">
                No moments yet.
              </p>
            ) : (
              moments.map((m) => (
                <div key={m.id} className="overflow-hidden rounded-xl border border-(--border-strong) bg-(--card-bg)">
                  <div className="relative h-36 bg-(--surface)">
                    <Image src={m.mediaUrl} alt="" fill sizes="220px" className="object-cover" />
                  </div>
                  <div className="p-3">
                    <p className="truncate text-[13px]">{m.caption || "No caption"}</p>
                    <form action={removeM} className="mt-2">
                      <input type="hidden" name="id" value={m.id} />
                      <button type="submit" className="text-xs font-bold text-(--primary)">Remove</button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>

          <form action={saveM} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
            <input type="hidden" name="artistId" value={artistId} />
            <h3 className="mb-4 text-[15px] font-bold">Add a moment</h3>
            <UploadField name="mediaUrl" label="Image" />
            <div className="mt-4">
              <label className={label} htmlFor="caption">Caption</label>
              <input id="caption" name="caption" className={field} />
            </div>
            <div className="mt-4">
              <label className={label} htmlFor="position">Order</label>
              <input id="position" name="position" type="number" min={0} defaultValue={moments.length} className={field} />
            </div>
            <button type="submit" disabled={savingM}
              className="mt-4 w-full rounded bg-(--primary) py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {savingM ? "Saving…" : "Add moment"}
            </button>
          </form>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-bold">Artist stories</h2>
        <p className="mb-4 text-sm text-(--sub-text)">Long-form pieces that appear on the artist&apos;s page.</p>
        <Note state={sState} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-xl border border-(--border-strong) bg-(--card-bg)">
            {stories.length === 0 ? (
              <p className="p-6 text-sm text-(--sub-text)">No stories yet.</p>
            ) : (
              stories.map((s) => (
                <div key={s.id} className="flex items-center gap-4 border-b border-(--border-strong) px-5 py-3.5 last:border-0">
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-sm">{s.title}</b>
                    <span className="text-xs text-(--sub-text)">{s.published ? "Published" : "Draft"}</span>
                  </div>
                  <button type="button" onClick={() => setEditingStory(s)}
                    className="rounded border border-(--border-strong) px-3 py-1.5 text-xs font-bold">Edit</button>
                  <form action={removeS}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className="rounded border border-(--primary)/40 px-3 py-1.5 text-xs font-bold text-(--primary)">
                      Delete
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>

          <form action={saveS} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
            <input type="hidden" name="artistId" value={artistId} />
            {editingStory ? <input type="hidden" name="id" value={editingStory.id} /> : null}
            <h3 className="mb-4 text-[15px] font-bold">{editingStory ? "Edit story" : "New story"}</h3>

            <div className="mb-4">
              <label className={label} htmlFor="title">Title</label>
              <input id="title" name="title" required defaultValue={editingStory?.title ?? ""} className={field} />
            </div>
            <UploadField name="coverImage" label="Cover image" defaultValue={editingStory?.coverImage ?? ""} />
            <div className="mt-4">
              <label className={label} htmlFor="bodyText">Body</label>
              <textarea id="bodyText" name="bodyText" rows={8} defaultValue={editingStory?.bodyText ?? ""} className={field}
                placeholder="Separate paragraphs with a blank line." />
            </div>
            <label className="mt-3 flex items-center justify-between py-2 text-sm">
              <span>Publish now</span>
              <input type="checkbox" name="publish" defaultChecked={editingStory?.published ?? false} className="size-4 accent-(--primary)" />
            </label>
            <div className="mt-3 flex gap-2">
              <button type="submit" disabled={savingS}
                className="flex-1 rounded bg-(--primary) py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {savingS ? "Saving…" : "Save story"}
              </button>
              {editingStory ? (
                <button type="button" onClick={() => setEditingStory(null)}
                  className="rounded border border-(--border-strong) px-4 text-sm font-bold">New</button>
              ) : null}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
