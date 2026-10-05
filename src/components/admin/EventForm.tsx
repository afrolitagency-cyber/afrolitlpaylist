"use client";

import { useActionState, useState } from "react";
import { saveEvent } from "@/lib/actions/events";
import type { ActionState } from "@/lib/actions/_result";
import { UploadField } from "@/components/ui/UploadField";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";
const label = "mb-1.5 block text-xs font-bold";

export type EventValues = {
  id?: string;
  title: string; slug: string; description: string; startsAt: string; doorsAt: string;
  timezone: string; venue: string; address: string; country: string; seriesId: string;
  lineupArtistIds: string[]; registrationOpen: boolean; registrationUrl: string;
  capacity: string; soldOut: boolean; status: string; coverImage: string;
};

export function EventForm({
  values, series, artists,
}: {
  values: EventValues;
  series: { id: string; name: string }[];
  artists: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveEvent, null);
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
            <label className={label} htmlFor="title">Event title</label>
            <input id="title" name="title" required defaultValue={values.title} className={field} />
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="slug">Slug</label>
              <input id="slug" name="slug" defaultValue={values.slug} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="seriesId">Series</label>
              <select id="seriesId" name="seriesId" defaultValue={values.seriesId} className={field}>
                <option value="">— none —</option>
                {series.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <p className="mt-1.5 text-xs text-(--sub-text)">Series events appear in the site nav dropdown.</p>
            </div>
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={label} htmlFor="startsAt">Starts</label>
              <input id="startsAt" name="startsAt" type="datetime-local" required defaultValue={values.startsAt} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="doorsAt">Doors</label>
              <input id="doorsAt" name="doorsAt" type="datetime-local" defaultValue={values.doorsAt} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="timezone">Timezone</label>
              <select id="timezone" name="timezone" defaultValue={values.timezone} className={field}>
                <option value="Africa/Lagos">Africa/Lagos</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </div>
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="venue">Venue</label>
              <input id="venue" name="venue" defaultValue={values.venue} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="country">Country</label>
              <input id="country" name="country" defaultValue={values.country} className={field} />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="address">Address</label>
            <input id="address" name="address" defaultValue={values.address} className={field} />
          </div>
        </div>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <label className={label} htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={6} defaultValue={values.description} className={field} />
        </div>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <label className={label} htmlFor="lineupArtistIds">Lineup</label>
          <select id="lineupArtistIds" name="lineupArtistIds" multiple defaultValue={values.lineupArtistIds}
            className={`${field} h-44`}>
            {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <p className="mt-1.5 text-xs text-(--sub-text)">Each name links to its artist page on the public listing.</p>
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
          <button type="submit" disabled={pending}
            className="w-full rounded bg-(--primary) py-3 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? "Saving…" : "Save event"}
          </button>
        </div>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h3 className="mb-4 text-[15px] font-bold">Registration</h3>
          <label className="flex items-center justify-between py-2.5 text-sm">
            <span>Registration open</span>
            <input type="checkbox" name="registrationOpen" defaultChecked={values.registrationOpen} className="size-4 accent-(--primary)" />
          </label>
          <label className="flex items-center justify-between py-2.5 text-sm">
            <span>Sold out</span>
            <input type="checkbox" name="soldOut" defaultChecked={values.soldOut} className="size-4 accent-(--primary)" />
          </label>
          <div className="mb-4 mt-2">
            <label className={label} htmlFor="capacity">Capacity</label>
            <input id="capacity" name="capacity" type="number" min={1} defaultValue={values.capacity} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="registrationUrl">Ticket URL</label>
            <input id="registrationUrl" name="registrationUrl" defaultValue={values.registrationUrl} placeholder="https://" className={field} />
          </div>
        </div>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <UploadField name="coverImage" label="Cover image" defaultValue={values.coverImage} hint="1600 × 900 works best" />
        </div>
      </div>
    </form>
  );
}
