import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { eventSelect, toCard } from "@/lib/events";
import { EventsSlider } from "@/components/public/events/EventsSlider";
import { EventRows } from "@/components/public/events/EventRows";
import { Pagination } from "@/components/ui/Pagination";

export const revalidate = 300;
export const metadata = { title: "Events" };

const PER_PAGE = 20;

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ when?: string; page?: string }> }) {
  const { when, page } = await searchParams;
  const past = when === "past";
  const current = Math.max(1, Number(page ?? 1) || 1);
  const where = { status: "PUBLISHED" as const, startsAt: past ? { lt: new Date() } : { gte: new Date() } };

  const [rows, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { startsAt: past ? "desc" : "asc" },
      skip: (current - 1) * PER_PAGE,
      take: PER_PAGE,
      select: eventSelect,
    }),
    prisma.event.count({ where }),
  ]);

  const events = rows.map(toCard);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const slide = past ? [] : events.slice(0, 8);

  return (
    <div className="wrap py-[clamp(18px,3vw,34px)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-(--primary)">
        {past ? "Archive" : "Live · Upcoming"}
      </p>
      <h1 className="mb-5 mt-2 text-[clamp(1.7rem,3.8vw,2.8rem)] font-bold tracking-tight">
        {past ? "Past events" : "Don’t miss the next one"}
      </h1>

      <div className="mb-7 flex gap-2">
        {([
          { label: "Upcoming", href: "/events", active: !past },
          { label: "Past events", href: "/events?when=past", active: past },
        ] as const).map((t) => (
          <Link key={t.href} href={t.href}
            className={`rounded-full border px-4 py-2 text-[13px] font-semibold ${t.active ? "border-(--primary) bg-(--primary) text-white" : "border-(--border-strong) text-(--sub-text)"}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {!past && slide.length ? <EventsSlider events={slide} /> : null}

      <p className="mb-3.5 mt-11 text-[11px] font-semibold uppercase tracking-[0.2em] text-(--primary)">
        {past ? "Earlier shows" : "All upcoming events"}
      </p>

      {events.length === 0 ? (
        <p className="text-(--sub-text)">No {past ? "past" : "upcoming"} events.</p>
      ) : (
        <EventRows events={events} />
      )}

      <Pagination page={current} pages={pages} basePath="/events" params={{ when }} />
    </div>
  );
}
