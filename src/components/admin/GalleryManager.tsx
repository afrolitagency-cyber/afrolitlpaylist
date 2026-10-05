"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { saveGalleryImage, deleteGalleryImage } from "@/lib/actions/media";
import type { ActionState } from "@/lib/actions/_result";
import { UploadField } from "@/components/ui/UploadField";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";
const label = "mb-1.5 block text-xs font-bold";

export type GalleryItem = {
  id: string; url: string; caption: string; credit: string; altText: string;
  collectionId: string; eventId: string; published: boolean; featured: boolean;
};

export function GalleryManager({
  images, collections, events,
}: {
  images: GalleryItem[];
  collections: { id: string; name: string }[];
  events: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveGalleryImage, null);
  const [delState, remove] = useActionState<ActionState, FormData>(deleteGalleryImage, null);
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const msg = state ?? delState;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        {msg ? (
          <p role={msg.ok ? "status" : "alert"}
            className={`mb-4 rounded border p-3 text-sm ${msg.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
            {msg.ok ? msg.message : msg.error}
          </p>
        ) : null}

        {images.length === 0 ? (
          <p className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-6 text-sm text-(--sub-text)">
            Nothing in the gallery yet. Upload on the right to add the first image.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((img) => (
              <div key={img.id} className={`overflow-hidden rounded-xl border bg-(--card-bg) ${selected?.id === img.id ? "border-(--primary)" : "border-(--border-strong)"}`}>
                <button type="button" onClick={() => setSelected(img)} className="relative block h-40 w-full bg-(--surface)">
                  <Image src={img.url} alt={img.altText} fill sizes="320px" className="object-cover" />
                  <span className={`absolute right-2 top-2 rounded px-2 py-1 text-[11px] font-bold ${img.published ? "bg-emerald-500/80 text-black" : "bg-black/70 text-white"}`}>
                    {img.published ? "Published" : "Draft"}
                  </span>
                </button>
                <div className="p-3">
                  <b className="block truncate text-[13.5px]">{img.caption || "Untitled"}</b>
                  <span className="text-xs text-(--sub-text)">{img.credit || "No credit"}</span>
                </div>
                <div className="flex items-center justify-between border-t border-(--border-strong) px-3 py-2">
                  <button type="button" onClick={() => setSelected(img)} className="text-xs font-bold hover:text-(--primary)">Edit</button>
                  <form action={remove}>
                    <input type="hidden" name="id" value={img.id} />
                    <button type="submit" className="text-xs font-bold text-(--primary)">Remove</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form action={action} className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
        <h3 className="mb-4 text-[15px] font-bold">{selected ? "Edit image" : "Add an image"}</h3>
        {selected ? <input type="hidden" name="id" value={selected.id} /> : null}

        <UploadField name="url" label="Image" defaultValue={selected?.url ?? ""} hint="Published images appear in the public grid." />

        <div className="mt-4">
          <label className={label} htmlFor="caption">Caption</label>
          <input id="caption" name="caption" defaultValue={selected?.caption ?? ""} className={field} />
        </div>
        <div className="mt-4">
          <label className={label} htmlFor="credit">Credit</label>
          <input id="credit" name="credit" defaultValue={selected?.credit ?? ""} className={field} />
        </div>
        <div className="mt-4">
          <label className={label} htmlFor="altText">Alt text</label>
          <textarea id="altText" name="altText" rows={2} defaultValue={selected?.altText ?? ""} className={field} />
        </div>
        <div className="mt-4">
          <label className={label} htmlFor="collectionId">Collection</label>
          <select id="collectionId" name="collectionId" defaultValue={selected?.collectionId ?? ""} className={field}>
            <option value="">— none —</option>
            {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="mt-4">
          <label className={label} htmlFor="eventId">Linked event</label>
          <select id="eventId" name="eventId" defaultValue={selected?.eventId ?? ""} className={field}>
            <option value="">— none —</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>

        <label className="mt-2 flex items-center justify-between py-2.5 text-sm">
          <span>Published</span>
          <input type="checkbox" name="published" defaultChecked={selected?.published ?? false} className="size-4 accent-(--primary)" />
        </label>
        <label className="flex items-center justify-between py-2.5 text-sm">
          <span>Featured</span>
          <input type="checkbox" name="featured" defaultChecked={selected?.featured ?? false} className="size-4 accent-(--primary)" />
        </label>

        <div className="mt-3 flex gap-2">
          <button type="submit" disabled={pending}
            className="flex-1 rounded bg-(--primary) py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? "Saving…" : "Save image"}
          </button>
          {selected ? (
            <button type="button" onClick={() => setSelected(null)} className="rounded border border-(--border-strong) px-4 text-sm font-bold">
              New
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
