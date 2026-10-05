"use client";

import { useActionState, useState } from "react";
import { saveEpisode } from "@/lib/actions/episodes";
import type { ActionState } from "@/lib/actions/_result";
import { UploadField } from "@/components/ui/UploadField";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";
const label = "mb-1.5 block text-xs font-bold";

export type EpisodeValues = {
  id?: string;
  title: string; slug: string; excerpt: string; audioUrl: string; coverImage: string;
  durationSec: string; season: string; number: string;
  spotifyUrl: string; appleUrl: string; youtubeUrl: string;
  status: string; publishedAt: string; featured: boolean; commentsOn: boolean;
};

export function EpisodeForm({ values }: { values: EpisodeValues }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveEpisode, null);
  const [status, setStatus] = useState(values.status);

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <input type="hidden" name="status" value={status} />

      <div className="space-y-5">
        {state ? (
          <p role={state.ok ? "status" : "alert"}
            className={`rounded border p-3 text-sm ${state.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
            {state.ok ? state.message : state.error}
          </p>
        ) : null}

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <div className="mb-4">
            <label className={label} htmlFor="title">Episode title</label>
            <input id="title" name="title" required defaultValue={values.title} className={field} />
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={label} htmlFor="slug">Slug</label>
              <input id="slug" name="slug" defaultValue={values.slug} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="season">Season</label>
              <input id="season" name="season" type="number" min={1} defaultValue={values.season} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="number">Number</label>
              <input id="number" name="number" type="number" min={1} defaultValue={values.number} className={field} />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="excerpt">Excerpt</label>
            <textarea id="excerpt" name="excerpt" rows={3} defaultValue={values.excerpt} className={field} />
          </div>
        </div>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <UploadField name="audioUrl" label="Audio file" kind="audio" defaultValue={values.audioUrl}
            hint="mp3 or m4a. Large files upload straight to storage, not through the server." />
          <div className="mt-4">
            <label className={label} htmlFor="durationSec">Duration (seconds)</label>
            <input id="durationSec" name="durationSec" type="number" min={1} defaultValue={values.durationSec} className={field} />
          </div>
        </div>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h3 className="mb-4 text-[15px] font-bold">Platforms</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {([["spotifyUrl", "Spotify"], ["appleUrl", "Apple Podcasts"], ["youtubeUrl", "YouTube"]] as const).map(([n, l]) => (
              <div key={n}>
                <label className={label} htmlFor={n}>{l}</label>
                <input id={n} name={n} defaultValue={values[n]} placeholder="https://" className={field} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h3 className="mb-4 text-[15px] font-bold">Publishing</h3>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${field} mb-4`} aria-label="Status">
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <div className="mb-4">
            <label className={label} htmlFor="publishedAt">Publish date</label>
            <input id="publishedAt" name="publishedAt" type="datetime-local" defaultValue={values.publishedAt} className={field} />
          </div>
          <label className="flex items-center justify-between py-2.5 text-sm">
            <span>Featured episode</span>
            <input type="checkbox" name="featured" defaultChecked={values.featured} className="size-4 accent-(--primary)" />
          </label>
          <label className="flex items-center justify-between py-2.5 text-sm">
            <span>Allow comments</span>
            <input type="checkbox" name="commentsOn" defaultChecked={values.commentsOn} className="size-4 accent-(--primary)" />
          </label>
          <button type="submit" disabled={pending}
            className="mt-3 w-full rounded bg-(--primary) py-3 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? "Saving…" : "Save episode"}
          </button>
        </div>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <UploadField name="coverImage" label="Cover artwork" defaultValue={values.coverImage} hint="Square, 1400 × 1400" />
        </div>
      </div>
    </form>
  );
}
