"use client";

import { useActionState, useEffect, useState } from "react";
import { saveArtist } from "@/lib/actions/artists";
import type { ActionState } from "@/lib/actions/_result";
import { CoverImageField } from "@/components/admin/CoverImageField";
import { GENRES, parseGenres } from "@/lib/genres";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";
const label = "mb-1.5 block text-xs font-bold";

export type ArtistFormValues = {
  id?: string;
  name: string;
  genre: string;
  location: string;
  bio: string;
  coverImage: string;
  avatarImage: string;
  streamEmbedUrl: string;
  status: string;
  claimedEmail: string;
  openSubmission: boolean;
};

export function ArtistForm({ values, canInvite }: { values: ArtistFormValues; canInvite: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveArtist, null);
  const [claimEmail, setClaimEmail] = useState("");
  const selectedGenres = new Set(parseGenres(values.genre));

  useEffect(() => {
    if (state?.ok) setClaimEmail("");
  }, [state]);

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <div className="space-y-5">
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

        {values.openSubmission ? (
          <p className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
            This artist has an open submission. Saving replaces it with the fields on this form.
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
            <label className={label} htmlFor="bio">Bio</label>
            <textarea id="bio" name="bio" rows={6} defaultValue={values.bio} className={field} />
          </div>
        </div>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <CoverImageField
            name="avatarImage"
            label="Profile photo"
            defaultValue={values.avatarImage}
            shape="square"
            hint="Square works best."
          />
          <CoverImageField
            name="coverImage"
            label="Cover image"
            defaultValue={values.coverImage}
            hint="1600 × 900 works best."
          />
          <div>
            <label className={label} htmlFor="streamEmbedUrl">Music embed URL</label>
            <input
              id="streamEmbedUrl"
              name="streamEmbedUrl"
              defaultValue={values.streamEmbedUrl}
              placeholder="Spotify, Apple Music, YouTube or SoundCloud"
              className={field}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h3 className="mb-4 text-[15px] font-bold">Publishing</h3>
          <label className={label} htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={values.status === "LIVE" ? "LIVE" : "DRAFT"} className={`${field} mb-4`}>
            <option value="DRAFT">Draft — hidden from the site</option>
            <option value="LIVE">Live — on the public artist page</option>
          </select>
          <button type="submit" disabled={pending}
            className="w-full rounded bg-(--primary) py-3 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? "Saving…" : "Save artist"}
          </button>
        </div>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h3 className="mb-2 text-[15px] font-bold">Account</h3>
          {values.claimedEmail ? (
            <p className="text-sm text-(--sub-text)">Claimed by {values.claimedEmail}. They edit this profile from the artist portal.</p>
          ) : canInvite ? (
            <>
              <p className="mb-3 text-sm text-(--sub-text)">
                Leave this empty to keep the profile unclaimed. An email here invites that person to take it over.
              </p>
              <label className={label} htmlFor="claimEmail">Invite email</label>
              <input id="claimEmail" name="claimEmail" type="email" value={claimEmail} onChange={(e) => setClaimEmail(e.target.value)} placeholder="name@example.com" className={field} />
            </>
          ) : (
            <p className="text-sm text-(--sub-text)">This profile has no login yet. An admin can email someone to claim it.</p>
          )}
        </div>
      </div>
    </form>
  );
}
