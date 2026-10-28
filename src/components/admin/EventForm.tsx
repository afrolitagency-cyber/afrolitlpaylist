"use client";

import { useActionState, useState } from "react";
import { saveEvent, reviewEvent, requestUnpublish, resolveUnpublish } from "@/lib/actions/events";
import type { ActionState } from "@/lib/actions/_result";
import { CoverImageField } from "@/components/admin/CoverImageField";
import { Opt, Req } from "@/components/admin/FieldMarks";

const field = "w-full rounded border border-(--border) bg-(--input-bg) p-3 text-sm";
const label = "mb-1.5 block text-xs font-bold";

export type EventValues = {
  id?: string;
  title: string; slug: string; description: string; startsAt: string; doorsAt: string;
  timezone: string; venue: string; address: string; country: string; city: string;
  eventType: string; ageLimit: string; schedule: string; seriesId: string;
  lineupArtistIds: string[]; registrationOpen: boolean; registrationUrl: string;
  ticketed: boolean; priceFrom: string; capacity: string; soldOut: boolean;
  presentedBy: string; presentedByArtistId: string; hostContact: string;
  hostSharePercent: string; settlementNote: string;
  status: string; coverImage: string; reviewNote: string;
};

export function EventForm({
  values, series, artists, canPublish,
}: {
  values: EventValues;
  series: { id: string; name: string }[];
  artists: { id: string; name: string }[];
  canPublish: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveEvent, null);
  const [status, setStatus] = useState(values.status);
  const [ticketed, setTicketed] = useState(values.ticketed);
  const detail = state && !state.ok && state.fieldErrors
    ? Object.entries(state.fieldErrors).map(([name, messages]) => `${name}: ${messages?.[0] ?? "invalid"}`).join(" ")
    : null;

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <input type="hidden" name="status" value={status} />

      <div className="space-y-5">
        {state ? (
          <p role={state.ok ? "status" : "alert"}
            className={`rounded border p-3 text-sm ${state.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
            {state.ok ? state.message : [state.error, detail].filter(Boolean).join(" ")}
          </p>
        ) : null}

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <div className="mb-4">
            <label className={label} htmlFor="title">Event title<Req /></label>
            <input id="title" name="title" required defaultValue={values.title} className={field} />
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="slug">Slug<Opt /></label>
              <input id="slug" name="slug" defaultValue={values.slug} className={field} />
              <p className="mt-1.5 text-xs text-(--sub-text)">Leave blank to generate from the title.</p>
            </div>
            <div>
              <label className={label} htmlFor="seriesId">Series<Opt /></label>
              <select id="seriesId" name="seriesId" defaultValue={values.seriesId} className={field}>
                <option value="">— none —</option>
                {series.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <p className="mt-1.5 text-xs text-(--sub-text)">Series events appear in the site nav dropdown.</p>
            </div>
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={label} htmlFor="eventType">Type<Opt /></label>
              <input id="eventType" name="eventType" defaultValue={values.eventType} placeholder="Concert, Festival…" className={field} />
            </div>
            <div>
              <label className={label} htmlFor="city">City<Opt /></label>
              <input id="city" name="city" defaultValue={values.city} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="ageLimit">Age limit<Opt /></label>
              <input id="ageLimit" name="ageLimit" defaultValue={values.ageLimit} placeholder="18+, All ages…" className={field} />
            </div>
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={label} htmlFor="startsAt">Starts<Req /></label>
              <input id="startsAt" name="startsAt" type="datetime-local" required defaultValue={values.startsAt} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="doorsAt">Doors<Opt /></label>
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
              <label className={label} htmlFor="venue">Venue<Opt /></label>
              <input id="venue" name="venue" defaultValue={values.venue} className={field} />
              <p className="mt-1.5 text-xs text-(--sub-text)">Required before review or publish.</p>
            </div>
            <div>
              <label className={label} htmlFor="country">Country<Opt /></label>
              <input id="country" name="country" defaultValue={values.country} className={field} />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="address">Address<Opt /></label>
            <input id="address" name="address" defaultValue={values.address} className={field} />
          </div>
        </div>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <label className={label} htmlFor="description">About this event<Opt /></label>
          <textarea id="description" name="description" rows={6} defaultValue={values.description} className={field} />
        </div>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <label className={label} htmlFor="schedule">Schedule<Opt /></label>
          <textarea id="schedule" name="schedule" rows={5} defaultValue={values.schedule} className={field}
            placeholder={"19:00 | Doors open | Arrive early\n20:00 | Opening set\n21:30 | Headline performance"} />
          <p className="mt-1.5 text-xs text-(--sub-text)">One row per beat: time | title | optional note</p>
        </div>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <label className={label} htmlFor="lineupArtistIds">Lineup<Opt /></label>
          <select id="lineupArtistIds" name="lineupArtistIds" multiple defaultValue={values.lineupArtistIds}
            className={`${field} h-44`}>
            {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <p className="mt-1.5 text-xs text-(--sub-text)">Each name links to its artist page on the public listing.</p>
        </div>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h3 className="mb-1 text-[15px] font-bold">Presented by</h3>
          <p className="mb-4 text-xs text-(--sub-text)">
            Leave blank for our own show. On-behalf-of hosts still sell through AfroLit&apos;s Paystack.
            Host share is paid after the event — not at checkout.
          </p>
          <div className="mb-4">
            <label className={label} htmlFor="presentedBy">Credit on the event page<Opt /></label>
            <input id="presentedBy" name="presentedBy" defaultValue={values.presentedBy} placeholder="Palmwine Records" className={field} />
          </div>
          <div className="mb-4">
            <label className={label} htmlFor="presentedByArtistId">Linked artist<Opt /></label>
            <select id="presentedByArtistId" name="presentedByArtistId" defaultValue={values.presentedByArtistId} className={field}>
              <option value="">— none —</option>
              {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <p className="mt-1.5 text-xs text-(--sub-text)">Independent of lineup. Puts the event on their profile later.</p>
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="hostContact">Host contact<Opt /></label>
              <input id="hostContact" name="hostContact" defaultValue={values.hostContact} placeholder="email or phone" className={field} />
            </div>
            <div>
              <label className={label} htmlFor="hostSharePercent">Host share (%)<Opt /></label>
              <input id="hostSharePercent" name="hostSharePercent" type="number" min={0} max={100} step={1} defaultValue={values.hostSharePercent} className={field} />
              <p className="mt-1.5 text-xs text-(--sub-text)">Stored as basis points. 70 means 70%.</p>
            </div>
          </div>
          <div>
            <label className={label} htmlFor="settlementNote">Settlement note<Opt /></label>
            <textarea id="settlementNote" name="settlementNote" rows={3} defaultValue={values.settlementNote} className={field} />
            <p className="mt-1.5 text-xs text-(--sub-text)">Record the agreed split here. The payout screen (gross, fees, refunds, host cut) waits on live Paystack keys.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h3 className="mb-4 text-[15px] font-bold">Publishing</h3>
          {values.reviewNote ? (
            <div className="mb-4 rounded-r border-l-[3px] border-amber-500 bg-(--surface-alt) p-3">
              <b className="text-sm">Sent back</b>
              <p className="mt-1 text-sm text-(--sub-text)">{values.reviewNote}</p>
            </div>
          ) : null}
          {canPublish ? (
            <>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${field} mb-4`} aria-label="Status">
                <option value="DRAFT">Draft</option>
                <option value="PENDING">Awaiting approval</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              <button type="submit" disabled={pending}
                className="w-full rounded bg-(--primary) py-3 text-sm font-semibold text-white disabled:opacity-60">
                {pending ? "Saving…" : "Save event"}
              </button>
            </>
          ) : values.status === "PUBLISHED" ? (
            <>
              <p className="mb-4 text-sm text-(--sub-text)">
                This event is live. Saving keeps it published. To take it off the site, ask an admin below.
              </p>
              <button type="submit" disabled={pending}
                className="w-full rounded bg-(--primary) py-3 text-sm font-semibold text-white disabled:opacity-60">
                {pending ? "Saving…" : "Save event"}
              </button>
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-(--sub-text)">
                {status === "PENDING"
                  ? "Waiting for an admin to approve this before it goes on the site."
                  : "Save a draft, or send it for an admin to approve. It stays off the site until then."}
              </p>
              <div className="grid gap-2">
                <button type="submit" name="intent" value="draft" disabled={pending}
                  onClick={() => setStatus("DRAFT")}
                  className="w-full rounded border border-(--border-strong) py-3 text-sm font-semibold disabled:opacity-60">
                  {pending ? "Saving…" : "Save draft"}
                </button>
                <button type="submit" name="intent" value="review" disabled={pending}
                  onClick={() => setStatus("PENDING")}
                  className="w-full rounded bg-(--primary) py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {pending ? "Saving…" : "Submit for review"}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <h3 className="mb-4 text-[15px] font-bold">Attendance</h3>
          <label className="flex items-center justify-between py-2.5 text-sm">
            <span>Ticketed</span>
            <input
              type="checkbox"
              name="ticketed"
              checked={ticketed}
              onChange={(e) => setTicketed(e.target.checked)}
              className="size-4 accent-(--primary)"
            />
          </label>
          <label className="flex items-center justify-between py-2.5 text-sm">
            <span>Registration open</span>
            <input type="checkbox" name="registrationOpen" defaultChecked={values.registrationOpen} className="size-4 accent-(--primary)" />
          </label>
          <label className="flex items-center justify-between py-2.5 text-sm">
            <span>Sold out</span>
            <input type="checkbox" name="soldOut" defaultChecked={values.soldOut} className="size-4 accent-(--primary)" />
          </label>
          <div className="mb-4 mt-2">
            <label className={label} htmlFor="capacity">Capacity<Opt /></label>
            <input id="capacity" name="capacity" type="number" min={1} defaultValue={values.capacity} className={field} />
          </div>
          {ticketed ? (
            <>
              <div className="mb-4">
                <label className={label} htmlFor="priceFrom">From price (₦)<Opt /></label>
                <input id="priceFrom" name="priceFrom" type="number" min={0} defaultValue={values.priceFrom} className={field} />
              </div>
              <div>
                <label className={label} htmlFor="registrationUrl">Ticket URL<Opt /></label>
                <input id="registrationUrl" name="registrationUrl" defaultValue={values.registrationUrl} placeholder="https://" className={field} />
                <p className="mt-1.5 text-xs text-(--sub-text)">From price is naira for display. Tiers store kobo.</p>
              </div>
            </>
          ) : (
            <p className="text-xs text-(--sub-text)">
              Free events show the registration form when Registration open is checked.
            </p>
          )}
          {!values.id ? (
            <p className="mt-3 text-xs text-(--sub-text)">Save the event first, then add ticket tiers.</p>
          ) : null}
        </div>

        <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
          <CoverImageField
            name="coverImage"
            label="Cover image"
            defaultValue={values.coverImage}
            hint="Without one, a red pattern cover is used."
          />
        </div>
      </div>
    </form>
  );
}

export function UnpublishRequest({ id, note }: { id: string; note: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(requestUnpublish, null);

  return (
    <form action={action} className="mt-5 rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
      <input type="hidden" name="id" value={id} />
      <h3 className="text-[15px] font-bold">Take this off the site</h3>
      <p className="mb-4 mt-1 text-sm text-(--sub-text)">
        An admin has to agree. Until then the event stays live and on sale.
      </p>
      {note ? (
        <p className="mb-4 text-sm text-(--sub-text)">Waiting on an admin. Current note: {note}</p>
      ) : null}
      {state ? (
        <p role={state.ok ? "status" : "alert"}
          className={`mb-4 rounded border p-3 text-sm ${state.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
          {state.ok ? state.message : state.error}
        </p>
      ) : null}
      <label className={label} htmlFor="unpublishNote">Why it should come off</label>
      <textarea id="unpublishNote" name="unpublishNote" rows={3} maxLength={1000} defaultValue={note} className={`${field} mb-4`} />
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="submit" name="intent" value="ask" disabled={pending}
          className="rounded bg-(--primary) py-3 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Sending…" : "Ask to unpublish"}
        </button>
        {note ? (
          <button type="submit" name="intent" value="cancel" disabled={pending}
            className="rounded border border-(--border-strong) py-3 text-sm font-semibold disabled:opacity-60">
            Cancel request
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function UnpublishReview({ id, note }: { id: string; note: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(resolveUnpublish, null);

  return (
    <form action={action} className="mt-5 rounded-xl border border-amber-500/40 bg-(--card-bg) p-5">
      <input type="hidden" name="id" value={id} />
      <h3 className="text-[15px] font-bold">Asked to come off the site</h3>
      <p className="mb-4 mt-1 text-sm text-(--sub-text)">{note}</p>
      <p className="mb-4 text-sm text-(--sub-text)">The event stays live until you take it off.</p>
      {state ? (
        <p role={state.ok ? "status" : "alert"}
          className={`mb-4 rounded border p-3 text-sm ${state.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
          {state.ok ? state.message : state.error}
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="submit" name="decision" value="remove" disabled={pending}
          className="rounded bg-(--primary) py-3 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Working…" : "Take it off the site"}
        </button>
        <button type="submit" name="decision" value="keep" disabled={pending}
          className="rounded border border-(--border-strong) py-3 text-sm font-semibold disabled:opacity-60">
          Keep it live
        </button>
      </div>
    </form>
  );
}

export function EventReview({ id }: { id: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(reviewEvent, null);

  return (
    <form action={action} className="mt-5 rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
      <input type="hidden" name="id" value={id} />
      <h3 className="text-[15px] font-bold">Review</h3>
      <p className="mb-4 mt-1 text-sm text-(--sub-text)">
        Approving publishes this event. Sending it back keeps it off the site and shows your note to the editor.
      </p>
      {state ? (
        <p role={state.ok ? "status" : "alert"}
          className={`mb-4 rounded border p-3 text-sm ${state.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
          {state.ok ? state.message : state.error}
        </p>
      ) : null}
      <label className={label} htmlFor="reviewNote">Note for the editor</label>
      <textarea id="reviewNote" name="reviewNote" rows={3} className={`${field} mb-4`} placeholder="Required only when sending it back" />
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="submit" name="decision" value="approve" disabled={pending}
          className="rounded bg-(--primary) py-3 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Working…" : "Approve and publish"}
        </button>
        <button type="submit" name="decision" value="return" disabled={pending}
          className="rounded border border-(--border-strong) py-3 text-sm font-semibold disabled:opacity-60">
          Send back
        </button>
      </div>
    </form>
  );
}
