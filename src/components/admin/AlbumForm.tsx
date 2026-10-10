"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveAlbum, deleteAlbum } from "@/lib/actions/albums";
import type { ActionState } from "@/lib/actions/_result";
import { CoverImageField } from "@/components/admin/CoverImageField";
import { GENRES } from "@/lib/genres";
import { PLATFORMS } from "@/lib/album-platforms";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";
const label = "mb-1.5 block text-xs font-bold";
const card = "rounded-xl border border-(--border-strong) bg-(--card-bg) p-5";

export type AlbumFormValues = {
  id?: string;
  slug?: string;
  title: string;
  artistName: string;
  artistId: string;
  releaseYear: string;
  genre: string;
  summary: string;
  about: string;
  tracks: string;
  coverImage: string;
  links: Record<string, string>;
  rank: string;
  movement: string;
  published: boolean;
};

export function AlbumForm({
  values,
  artists,
  created,
}: {
  values: AlbumFormValues;
  artists: { id: string; name: string }[];
  created: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveAlbum, null);
  const [deleteState, remove, deleting] = useActionState<ActionState, FormData>(deleteAlbum, null);
  const [published, setPublished] = useState(values.published);
  const message = state ?? deleteState ?? (created ? { ok: true as const, message: "Album created." } : null);

  return (
    <div className="space-y-5">
      {message ? (
        <p
          role={message.ok ? "status" : "alert"}
          className={`rounded border p-3 text-sm ${
            message.ok
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"
          }`}
        >
          {message.ok ? message.message : message.error}
        </p>
      ) : null}

      <form id="album-form" action={action} className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
        {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
        <input type="hidden" name="published" value={published ? "true" : "false"} />

        <div className="space-y-5">
          <div className={card}>
            <h3 className="text-[15px] font-bold">Album details</h3>
            <p className="mb-4 text-xs text-(--sub-text)">Shown on the homepage, the chart and the album page.</p>
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="title">Album title <span className="text-(--primary)">*</span></label>
                <input id="title" name="title" required defaultValue={values.title} className={field} />
              </div>
              <div>
                <label className={label} htmlFor="artistName">Artist <span className="text-(--primary)">*</span></label>
                <input id="artistName" name="artistName" required defaultValue={values.artistName} className={field} />
              </div>
            </div>
            <div className="mb-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className={label} htmlFor="releaseYear">Release year</label>
                <input id="releaseYear" name="releaseYear" inputMode="numeric" defaultValue={values.releaseYear} className={field} />
              </div>
              <div>
                <label className={label} htmlFor="genre">Genre</label>
                <select id="genre" name="genre" defaultValue={values.genre} className={field}>
                  <option value="">—</option>
                  {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="artistId">Artist profile</label>
                <select id="artistId" name="artistId" defaultValue={values.artistId} className={field}>
                  <option value="">Not on the site</option>
                  {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className={label} htmlFor="summary">Short description</label>
              <input id="summary" name="summary" maxLength={240} defaultValue={values.summary}
                placeholder="One line for search results and sharing" className={field} />
            </div>
            <div className="mb-4">
              <label className={label} htmlFor="about">About this album</label>
              <textarea id="about" name="about" rows={5} defaultValue={values.about}
                placeholder="Why it matters, the sound, the story…" className={field} />
            </div>
            <div>
              <label className={label} htmlFor="tracks">Tracklist</label>
              <textarea id="tracks" name="tracks" rows={8} defaultValue={values.tracks}
                placeholder="One track per line" className={field} />
              <p className="mt-1.5 text-xs text-(--sub-text)">One song per line. Order is kept.</p>
            </div>
          </div>

          <div className={card}>
            <h3 className="text-[15px] font-bold">Publishing &amp; chart</h3>
            <p className="mb-4 text-xs text-(--sub-text)">Position and movement are set by editors. No play counts needed.</p>
            <div className="mb-4 grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Status">
              {[
                { on: false, title: "Draft", sub: "Keep off the site" },
                { on: true, title: "Published", sub: "On the homepage and chart" },
              ].map((o) => (
                <button
                  key={o.title}
                  type="button"
                  role="radio"
                  aria-checked={published === o.on}
                  onClick={() => setPublished(o.on)}
                  className={`rounded-[10px] border px-4 py-2.5 text-left text-sm ${
                    published === o.on ? "border-(--primary) text-(--primary)" : "border-(--border-strong)"
                  }`}
                >
                  {o.title}
                  <small className="mt-0.5 block text-xs text-(--sub-text)">{o.sub}</small>
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="rank">Chart position</label>
                <input id="rank" name="rank" type="number" min={1} max={999} required defaultValue={values.rank} className={field} />
              </div>
              <div>
                <label className={label} htmlFor="movement">Movement vs last week</label>
                <input id="movement" name="movement" type="number" min={-99} max={99} defaultValue={values.movement}
                  placeholder="2 or -1" className={field} />
                <p className="mt-1.5 text-xs text-(--sub-text)">Positive moves up, negative moves down, 0 shows a dash.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className={card}>
            <CoverImageField name="coverImage" label="Cover image" defaultValue={values.coverImage} shape="tile"
              hint="Square works best. No cover? A generated pattern is used." />
          </div>

          <div className={card}>
            <h3 className="text-[15px] font-bold">Listen links</h3>
            <p className="mb-4 text-xs text-(--sub-text)">
              Where &ldquo;Listen on…&rdquo; sends readers. Leave all blank to send them to a search on each app.
              A Spotify album or playlist link also shows the Spotify player in place of the tracklist on the album page.
            </p>
            {PLATFORMS.map((p) => (
              <div key={p.key} className="mb-3 last:mb-0">
                <label className={label} htmlFor={`link_${p.key}`}>{p.label}</label>
                <input id={`link_${p.key}`} name={`link_${p.key}`} defaultValue={values.links[p.key] ?? ""}
                  placeholder="https://…" className={field} />
              </div>
            ))}
          </div>

          <div className={card}>
            <button type="submit" disabled={pending}
              className="w-full rounded bg-(--primary) py-3 text-sm font-semibold text-white disabled:opacity-60">
              {pending ? "Saving…" : values.id ? "Save album" : "Create album"}
            </button>
            {values.slug && values.published ? (
              <Link href={`/albums/${values.slug}`} target="_blank" className="mt-3 block text-center text-xs font-bold text-(--primary)">
                View on the site ↗
              </Link>
            ) : null}
          </div>
        </div>
      </form>

      {values.id ? (
        <form
          action={remove}
          onSubmit={(e) => {
            if (!confirm("Delete this album from the chart? Its click history stays in analytics.")) e.preventDefault();
          }}
          className="flex justify-end"
        >
          <input type="hidden" name="id" value={values.id} />
          <button type="submit" disabled={deleting} className="text-xs font-bold text-(--primary) disabled:opacity-60">
            {deleting ? "Deleting…" : "Delete album"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
