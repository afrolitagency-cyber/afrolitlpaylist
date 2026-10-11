import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import {
  eventSelect, toCard, spotsLeft, readSchedule, formatTime, naira, getUpcomingEvents,
} from "@/lib/events";
import { EventsSlider } from "@/components/public/events/EventsSlider";
import { EventRows } from "@/components/public/events/EventRows";
import { RegisterForm } from "@/components/public/RegisterForm";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = await prisma.event.findUnique({
    where: { slug },
    select: { title: true, description: true, coverImage: true },
  });
  if (!e) return { title: "Not found" };
  return {
    title: e.title,
    description: e.description?.slice(0, 160) ?? undefined,
    openGraph: { images: e.coverImage ? [e.coverImage] : undefined },
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    select: { ...eventSelect, series: { select: { name: true, slug: true } } },
  });
  if (!event || event.status !== "PUBLISHED") notFound();

  const card = toCard(event);
  const left = spotsLeft(event);
  const schedule = readSchedule(event.schedule);
  const more = await getUpcomingEvents(8);
  const doorsLabel = event.doorsAt ? formatTime(event.doorsAt, event.timezone) : null;
  const mapsQuery = [event.venue, event.address, event.city].filter(Boolean).join(", ");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: event.title,
    startDate: event.startsAt.toISOString(),
    location: {
      "@type": "Place",
      name: event.venue ?? undefined,
      address: event.address ?? undefined,
    },
    performer: event.lineup.map((a) => ({ "@type": "MusicGroup", name: a.name })),
  };

  return (
    <div className="wrap py-[clamp(18px,3vw,34px)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/events" className="mb-4 inline-block text-[13px] text-(--sub-text) transition hover:text-(--primary)">
        ← All events
      </Link>

      <EventsSlider events={[card]} mode="detail" />

      <div className="mt-[clamp(22px,3.4vw,38px)] grid items-start gap-[clamp(20px,3.4vw,44px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
        <div>
          {event.description ? (
            <section className="mb-9">
              <h2 className="mb-4 text-[1.2rem] font-bold tracking-tight">About this event</h2>
              <p className="whitespace-pre-line text-[15px] leading-[1.8] text-[#cfcfd4]">{event.description}</p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  doorsLabel ? { k: "Doors", v: doorsLabel } : null,
                  { k: "Starts", v: card.timeLabel },
                  event.ageLimit ? { k: "Age", v: event.ageLimit } : null,
                  { k: "Entry", v: event.ticketed ? (event.priceFrom != null ? `From ${naira(event.priceFrom)}` : "Ticketed") : "Free · RSVP" },
                ].filter(Boolean).map((f) => (
                  <div key={f!.k} className="rounded-2xl border border-white/10 p-3.5 text-[10.5px] uppercase tracking-[0.1em] text-(--sub-text)">
                    {f!.k}
                    <b className="mt-1 block text-[15px] font-semibold normal-case tracking-normal text-(--body-text)">{f!.v}</b>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {event.lineup.length ? (
            <section className="mb-9">
              <h2 className="mb-4 text-[1.2rem] font-bold tracking-tight">Lineup</h2>
              <div className="flex flex-wrap gap-x-[26px] gap-y-3.5">
                {event.lineup.map((a, i) => {
                  const body = (
                    <>
                      <span className="relative grid size-[54px] place-items-center overflow-hidden rounded-full bg-[linear-gradient(145deg,var(--primary),#ff8a96)] text-[18px] font-bold text-black">
                        {a.avatarImage ? (
                          <Image src={a.avatarImage} alt="" fill sizes="54px" className="object-cover" />
                        ) : (
                          a.name[0]
                        )}
                      </span>
                      <span>
                        <b className="block text-[14.5px]">{a.name}</b>
                        <em className="not-italic text-xs text-(--sub-text)">{i ? "Special guest" : "Headliner"}</em>
                      </span>
                    </>
                  );
                  return a.status === "LIVE" ? (
                    <Link key={a.slug} href={`/artists/${a.slug}`} className="flex items-center gap-3 hover:text-(--primary)">
                      {body}
                    </Link>
                  ) : (
                    <div key={a.slug} className="flex items-center gap-3">{body}</div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {schedule.length ? (
            <section className="mb-9">
              <h2 className="mb-4 text-[1.2rem] font-bold tracking-tight">Schedule</h2>
              <div className="ml-1.5 border-l border-white/10">
                {schedule.map((s) => (
                  <div key={`${s.time}-${s.title}`} className="relative pb-5 pl-6 last:pb-0 before:absolute before:left-[-5px] before:top-1 before:size-2.5 before:rounded-full before:bg-(--primary) before:shadow-[0_0_0_4px_rgba(229,9,20,.15)]">
                    <b className="block text-[15px] font-medium">{s.time} · {s.title}</b>
                    {s.note ? <span className="text-[12.5px] text-(--sub-text)">{s.note}</span> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {event.venue || event.address ? (
            <section className="mb-9">
              <h2 className="mb-4 text-[1.2rem] font-bold tracking-tight">Venue</h2>
              <div className="flex flex-wrap items-center justify-between gap-3.5 rounded-[20px] border border-white/10 bg-[#0f0f12] p-5">
                <span>
                  {event.venue ? <b className="block text-[15px]">{event.venue}</b> : null}
                  <span className="text-[13px] text-(--sub-text)">{[event.address, event.city].filter(Boolean).join(", ")}</span>
                </span>
                {mapsQuery ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/10 px-4 py-2.5 text-[12.5px] hover:border-(--primary) hover:text-(--primary)"
                  >
                    Get directions ↗
                  </a>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <aside id="attend" className="sticky top-[84px] rounded-[26px] border border-white/10 bg-[#101013] p-[clamp(18px,2.4vw,26px)] max-lg:static max-lg:order-first">
          {card.status === "out" ? (
            <RegisterForm
              eventId={event.id}
              eventTitle={event.title}
              spotsLeft={left}
              waitlist
              calendarExport={event.calendarExport}
              startsAtIso={card.startsAtIso}
              venue={event.venue}
            />
          ) : event.ticketed ? (
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-(--primary)">Tickets</span>
              <h3 className="mt-2 text-[1.4rem] font-bold tracking-tight">Get tickets</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-(--sub-text)">
                {card.dateLabel} · {card.timeLabel}
                {event.priceFrom != null ? ` · From ${naira(event.priceFrom)}` : ""}
              </p>
              {event.registrationUrl ? (
                <a
                  href={event.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 block w-full rounded-full bg-(--primary) py-3.5 text-center text-[13.5px] font-semibold text-black"
                >
                  Get tickets
                </a>
              ) : (
                <p className="mt-5 text-sm text-(--sub-text)">Ticket link coming soon.</p>
              )}
            </div>
          ) : event.registrationOpen ? (
            <RegisterForm
              eventId={event.id}
              eventTitle={event.title}
              spotsLeft={left}
              calendarExport={event.calendarExport}
              startsAtIso={card.startsAtIso}
              venue={event.venue}
            />
          ) : (
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-(--primary)">Attendance</span>
              <h3 className="mt-2 text-[1.4rem] font-bold tracking-tight">Coming soon</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-(--sub-text)">
                Registration isn&apos;t open yet for this event.
              </p>
            </div>
          )}
        </aside>
      </div>

      {more.some((e) => e.slug !== event.slug) ? (
        <>
          <p className="mb-3.5 mt-12 text-[11px] font-semibold uppercase tracking-[0.2em] text-(--primary)">More events</p>
          <EventRows events={more} excludeSlug={event.slug} />
        </>
      ) : null}
    </div>
  );
}
