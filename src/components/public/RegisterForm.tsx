"use client";

import { useActionState } from "react";
import { registerForEvent } from "@/lib/actions/registration";
import type { ActionState } from "@/lib/actions/_result";

const field =
  "w-full rounded-[14px] border border-white/10 bg-[#17171b] px-3.5 py-3 text-sm outline-none transition focus:border-(--primary) focus:shadow-[0_0_0_4px_rgba(229,9,20,.1)]";
const label = "mb-1.5 block text-xs text-(--sub-text)";

type Props = {
  eventId: string;
  eventTitle: string;
  spotsLeft: number | null;
  waitlist?: boolean;
  calendarExport?: boolean;
  startsAtIso?: string;
  venue?: string | null;
};

export function RegisterForm({
  eventId,
  eventTitle,
  spotsLeft,
  waitlist = false,
  calendarExport = true,
  startsAtIso,
  venue,
}: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(registerForEvent, null);

  if (state?.ok) {
    return (
      <div className="px-1 py-2 text-center" role="status">
        <svg viewBox="0 0 84 84" className="mx-auto size-[84px]" aria-hidden>
          <circle
            cx="42" cy="42" r="36"
            className="fill-none stroke-(--primary) stroke-[3] [stroke-dasharray:226] [stroke-dashoffset:226] animate-[event-draw_.8s_cubic-bezier(.16,1,.3,1)_forwards]"
          />
          <path
            d="M27 43l10 10 20-22"
            className="fill-none stroke-white stroke-[4] [stroke-linecap:round] [stroke-linejoin:round] [stroke-dasharray:50] [stroke-dashoffset:50] animate-[event-draw_.5s_cubic-bezier(.16,1,.3,1)_.6s_forwards]"
          />
        </svg>
        <h3 className="mt-3.5 text-[1.4rem] font-bold tracking-tight">
          {waitlist ? "You’re on the waitlist" : "You’re registered"}
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-(--sub-text)">{state.message}</p>
        {calendarExport && startsAtIso && !waitlist ? (
          <a
            href={calendarHref(eventTitle, startsAtIso, venue)}
            className="mt-4 inline-block rounded-full border border-white/10 px-4 py-2.5 text-[12.5px] hover:border-(--primary) hover:text-(--primary)"
          >
            Add to calendar
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3.5">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="waitlist" value={waitlist ? "1" : ""} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      <div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-(--primary)">
          {waitlist ? "Waitlist" : "Registration"}
        </span>
        <h3 className="mt-2 text-[1.4rem] font-bold tracking-tight">
          {waitlist ? "Join the waitlist" : "Reserve your spot"}
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-(--sub-text)">
          {waitlist
            ? "This event is sold out. Leave your details and we’ll email you first if a place opens."
            : "Free entry. Capacity is limited, so register to guarantee your place."}
        </p>
      </div>

      {state && !state.ok ? (
        <p role="alert" className="rounded border border-(--primary)/40 bg-(--primary)/10 p-3 text-sm text-(--primary)">
          {state.error}
        </p>
      ) : null}

      <div>
        <label className={label} htmlFor="reg-name">Full name</label>
        <input id="reg-name" name="name" required autoComplete="name" placeholder="e.g. Ada Obi" className={field} />
      </div>
      <div>
        <label className={label} htmlFor="reg-email">Email</label>
        <input id="reg-email" name="email" type="email" required autoComplete="email" placeholder="you@email.com" className={field} />
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-relaxed text-(--sub-text)">
        <input type="checkbox" name="optIn" className="mt-0.5 size-4 accent-(--primary)" />
        <span>Email me updates about this event and similar ones.</span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-(--primary) py-3.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Sending…" : waitlist ? "Join waitlist" : "Register now"}
      </button>

      {!waitlist && spotsLeft !== null && spotsLeft <= 20 ? (
        <p className="text-xs text-(--sub-text)">
          {spotsLeft} {spotsLeft === 1 ? "place" : "places"} left.
        </p>
      ) : null}
    </form>
  );
}

function calendarHref(title: string, startsAtIso: string, venue?: string | null) {
  const start = new Date(startsAtIso);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `SUMMARY:${title.replace(/\n/g, " ")}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    venue ? `LOCATION:${venue.replace(/\n/g, " ")}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}
