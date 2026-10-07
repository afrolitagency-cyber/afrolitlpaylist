"use client";

import { useActionState } from "react";
import { submitProfile } from "@/lib/actions/artists";
import type { ActionState } from "@/lib/actions/_result";
import { CoverImageField } from "@/components/admin/CoverImageField";
import { GENRES, parseGenres } from "@/lib/genres";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";
const label = "mb-1.5 block text-xs font-bold";

export type ProfileValues = {
  artistId: string;
  name: string;
  genre: string;
  location: string;
  bio: string;
  coverImage: string;
  avatarImage: string;
  streamEmbedUrl: string;
};

export function ProfileForm({ values, pendingReview }: { values: ProfileValues; pendingReview: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(submitProfile, null);
  const selectedGenres = new Set(parseGenres(values.genre));

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="artistId" value={values.artistId} />

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

      {pendingReview ? (
        <p className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
          You have a submission awaiting review. Saving again replaces it.
        </p>
      ) : null}

      <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
        <div className="mb-4">
          <label className={label} htmlFor="name">Artist name</label>
          <input id="name" name="name" defaultValue={values.name} required className={field} />
        </div>
        <div className="mb-4">
          <label className={label} htmlFor="location">Location</label>
          <input id="location" name="location" defaultValue={values.location} className={field} />
        </div>
        <fieldset className="mb-4">
          <legend className={label}>Genres</legend>
          <p className="mb-2 text-xs text-(--sub-text)">Select every genre that fits.</p>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((genre) => (
              <label key={genre} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="genre"
                  value={genre}
                  defaultChecked={selectedGenres.has(genre)}
                  className="peer sr-only"
                />
                <span className="inline-block rounded-full border border-(--border-strong) px-3 py-1.5 text-xs font-semibold text-(--sub-text) peer-checked:border-(--primary) peer-checked:bg-(--primary) peer-checked:text-white">
                  {genre}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label className={label} htmlFor="bio">Bio <span className="font-normal text-(--sub-text)">— required</span></label>
          <textarea id="bio" name="bio" rows={6} defaultValue={values.bio} className={field} />
        </div>
      </div>

      <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
        <CoverImageField
          name="avatarImage"
          label="Profile photo"
          defaultValue={values.avatarImage}
          required
          shape="square"
          hint="Square works best. Shown on your profile and in the artist row."
        />
        <CoverImageField
          name="coverImage"
          label="Cover image"
          defaultValue={values.coverImage}
          hint="1600 × 900 works best."
        />
        <div>
          <label className={label} htmlFor="streamEmbedUrl">Music embed URL</label>
          <input id="streamEmbedUrl" name="streamEmbedUrl" defaultValue={values.streamEmbedUrl}
            placeholder="Spotify, Apple Music, YouTube or SoundCloud" className={field} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending}
          className="rounded bg-(--primary) px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Submitting…" : "Submit for review"}
        </button>
        <p className="text-xs text-(--sub-text)">
          Nothing changes on your public page until an editor approves it.
        </p>
      </div>
    </form>
  );
}
