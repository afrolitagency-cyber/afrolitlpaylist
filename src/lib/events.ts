import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { eventPattern } from "@/lib/event-covers";

export type ScheduleItem = { time: string; title: string; note?: string };

export type EventStatus = "open" | "few" | "out" | "onsale" | "soon";

/** Everything the slider, rows and event page need, formatted on the server
 *  in the event's own timezone so the client never re-formats dates. */
export type EventCard = {
  id: string;
  slug: string;
  title: string;
  coverImage: string | null;
  pattern: string;
  eventType: string | null;
  city: string | null;
  venue: string | null;
  lineup: string[];
  day: string;
  month: string;
  dateLabel: string;
  timeLabel: string;
  startsAtIso: string;
  daysLeft: number;
  status: EventStatus;
  statusLabel: string;
  ticketed: boolean;
  priceFrom: number | null;
  ctaLabel: string;
  tag: string;
};

export const eventSelect = {
  id: true, slug: true, title: true, description: true, coverImage: true,
  startsAt: true, doorsAt: true, timezone: true, status: true,
  venue: true, address: true, city: true, country: true,
  eventType: true, ageLimit: true, schedule: true,
  registrationOpen: true, registrationUrl: true, ticketed: true, priceFrom: true,
  capacity: true, soldOut: true, calendarExport: true,
  lineup: { select: { name: true, slug: true, avatarImage: true, status: true } },
  _count: { select: { registrations: { where: { waitlist: false } } } },
} satisfies Prisma.EventSelect;

export type EventRow = Prisma.EventGetPayload<{ select: typeof eventSelect }>;

export const naira = (n: number) => `₦${n.toLocaleString("en-US")}`;

function formatter(timeZone: string, options: Intl.DateTimeFormatOptions, locale = "en-GB") {
  try {
    return new Intl.DateTimeFormat(locale, { timeZone, ...options });
  } catch {
    return new Intl.DateTimeFormat(locale, { timeZone: "Africa/Lagos", ...options });
  }
}

export function formatTime(d: Date, timeZone: string) {
  return formatter(timeZone, { hour: "numeric", minute: "2-digit" }, "en-US").format(d);
}

export function spotsLeft(e: Pick<EventRow, "capacity" | "_count">) {
  return e.capacity ? Math.max(0, e.capacity - e._count.registrations) : null;
}

export function readSchedule(value: unknown): ScheduleItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) => {
    if (!v || typeof v !== "object") return [];
    const { time, title, note } = v as Record<string, unknown>;
    if (typeof time !== "string" || typeof title !== "string") return [];
    return [{ time, title, note: typeof note === "string" && note ? note : undefined }];
  });
}

export function toCard(e: EventRow): EventCard {
  const tz = e.timezone;
  const left = spotsLeft(e);
  const fewAt = e.capacity ? Math.max(5, Math.ceil(e.capacity * 0.1)) : 0;

  const status: EventStatus = e.soldOut || left === 0
    ? "out"
    : e.ticketed
      ? "onsale"
      : e.registrationOpen
        ? left !== null && left <= fewAt ? "few" : "open"
        : "soon";

  const statusLabel = {
    out: "Sold out",
    onsale: "On sale",
    few: "Few left",
    open: "Registration open",
    soon: "Coming soon",
  }[status];

  const ctaLabel = status === "out"
    ? "Join waitlist"
    : e.ticketed ? "Get tickets" : e.registrationOpen ? "Register free" : "View event";

  const tag = status === "out"
    ? "Sold out"
    : e.ticketed ? (e.priceFrom ? `From ${naira(e.priceFrom)}` : "Tickets") : "Free · RSVP";

  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    coverImage: e.coverImage,
    pattern: eventPattern(e.slug),
    eventType: e.eventType,
    city: e.city,
    venue: e.venue,
    lineup: e.lineup.map((a) => a.name),
    day: formatter(tz, { day: "numeric" }).format(e.startsAt),
    month: formatter(tz, { month: "short" }).format(e.startsAt).toUpperCase(),
    dateLabel: formatter(tz, { weekday: "long", day: "numeric", month: "long" }).format(e.startsAt),
    timeLabel: formatTime(e.startsAt, tz),
    startsAtIso: e.startsAt.toISOString(),
    daysLeft: Math.max(0, Math.ceil((e.startsAt.getTime() - Date.now()) / 86_400_000)),
    status,
    statusLabel,
    ticketed: e.ticketed,
    priceFrom: e.priceFrom,
    ctaLabel,
    tag,
  };
}

export const getUpcomingEvents = cache(async (take = 8): Promise<EventCard[]> => {
  const rows = await prisma.event.findMany({
    where: { status: "PUBLISHED", startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    take,
    select: eventSelect,
  });
  return rows.map(toCard);
});
