import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { RegisterForm } from "@/components/public/RegisterForm";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = await prisma.event.findUnique({ where: { slug }, select: { title: true, description: true, coverImage: true } });
  if (!e) return { title: "Not found" };
  return { title: e.title, description: e.description?.slice(0, 160) ?? undefined, openGraph: { images: e.coverImage ? [e.coverImage] : undefined } };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      series: { select: { name: true, slug: true } },
      lineup: { select: { name: true, slug: true, avatarImage: true } },
      _count: { select: { registrations: true } },
    },
  });
  if (!event || event.status !== "PUBLISHED") notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: event.title,
    startDate: event.startsAt.toISOString(),
    location: { "@type": "Place", name: event.venue ?? undefined, address: event.address ?? undefined },
    performer: event.lineup.map((a: { name: string }) => ({ "@type": "MusicGroup", name: a.name })),
  };

  return (
    <div className="wrap py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="mb-3 text-xs text-(--sub-text)">
        <Link href="/events" className="hover:text-(--primary)">Events</Link>
        {event.series ? <> › <Link href={`/events/series/${event.series.slug}`} className="hover:text-(--primary)">{event.series.name}</Link></> : null}
      </p>

      {event.coverImage ? (
        <div className="relative mb-7 h-[clamp(200px,34vw,380px)] overflow-hidden rounded-xl bg-(--surface)">
          <Image src={event.coverImage} alt="" fill sizes="100vw" className="object-cover" priority />
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h1 className="text-[clamp(26px,4vw,42px)] font-black leading-tight">{event.title}</h1>
          <p className="mt-3 text-(--sub-text)">
            {event.startsAt.toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            {event.venue ? ` · ${event.venue}` : ""}
          </p>
          {event.description ? <p className="mt-6 whitespace-pre-line leading-[1.8] text-(--sub-text)">{event.description}</p> : null}

          {event.lineup.length ? (
            <>
              <h2 className="mb-4 mt-9 text-2xl font-extrabold">Lineup</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {event.lineup.map((a: { slug: string; name: string; avatarImage: string | null }) => (
                  <Link key={a.slug} href={`/artists/${a.slug}`} className="rounded-xl bg-(--card-bg) p-4 text-center">
                    <div className="relative mx-auto mb-2.5 size-16 overflow-hidden rounded-full bg-(--surface)">
                      {a.avatarImage ? <Image src={a.avatarImage} alt="" fill sizes="64px" className="object-cover" /> : null}
                    </div>
                    <span className="text-sm font-bold">{a.name}</span>
                  </Link>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl bg-(--card-bg) p-5">
            <h3 className="mb-3 font-extrabold">Attend</h3>
            {event.soldOut ? (
              <p className="font-bold text-(--primary)">Sold out</p>
            ) : !event.registrationOpen ? (
              <p className="text-sm text-(--sub-text)">Registration isn&apos;t open yet.</p>
            ) : event.registrationUrl ? (
              <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer"
                className="block rounded bg-(--primary) py-3 text-center text-sm font-semibold text-white">
                Get tickets
              </a>
            ) : (
              <RegisterForm
                eventId={event.id}
                spotsLeft={event.capacity ? Math.max(0, event.capacity - event._count.registrations) : null}
              />
            )}
          </div>

          {event.address ? (
            <div className="rounded-xl bg-(--card-bg) p-5">
              <h3 className="mb-2 font-extrabold">Venue</h3>
              <p className="text-sm text-(--sub-text)">{event.venue}</p>
              <p className="text-sm text-(--sub-text)">{event.address}</p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
