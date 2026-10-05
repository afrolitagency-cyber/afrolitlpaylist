"use client";

import { useActionState } from "react";
import { submitProfile } from "@/lib/actions/artists";
import type { ActionState } from "@/lib/actions/_result";

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
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="genre">Genre</label>
            <input id="genre" name="genre" defaultValue={values.genre} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="location">Location</label>
            <input id="location" name="location" defaultValue={values.location} className={field} />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="bio">Bio <span className="font-normal text-(--sub-text)">— required</span></label>
          <textarea id="bio" name="bio" rows={6} defaultValue={values.bio} className={field} />
        </div>
      </div>

      <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
        <div className="mb-4">
          <label className={label} htmlFor="avatarImage">Profile photo URL <span className="font-normal text-(--sub-text)">— required</span></label>
          <input id="avatarImage" name="avatarImage" defaultValue={values.avatarImage} className={field} />
        </div>
        <div className="mb-4">
          <label className={label} htmlFor="coverImage">Cover image URL</label>
          <input id="coverImage" name="coverImage" defaultValue={values.coverImage} className={field} />
        </div>
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
