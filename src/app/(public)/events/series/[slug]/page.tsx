import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = await prisma.eventSeries.findUnique({ where: { slug }, select: { name: true, description: true } });
  return s ? { title: s.name, description: s.description ?? undefined } : { title: "Not found" };
}

/** A series page — e.g. AfroQueens Camp — listing every event attached to it. */
export default async function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const series = await prisma.eventSeries.findUnique({
    where: { slug },
    include: {
      events: { where: { status: "PUBLISHED" }, orderBy: { startsAt: "asc" }, include: { lineup: { select: { name: true, slug: true } } } },
    },
  });
  if (!series) notFound();

  const now = Date.now();
  type SeriesEvent = (typeof series.events)[number];
  const upcoming: SeriesEvent[] = series.events.filter((e: SeriesEvent) => e.startsAt.getTime() >= now);
  const past: SeriesEvent[] = series.events.filter((e: SeriesEvent) => e.startsAt.getTime() < now);

  return (
    <div className="wrap py-8">
      <p className="mb-3 text-xs text-(--sub-text)">
        <Link href="/events" className="hover:text-(--primary)">Events</Link> › {series.name}
      </p>

      {series.coverImage ? (
        <div className="relative mb-7 h-[clamp(160px,28vw,300px)] overflow-hidden rounded-xl bg-(--surface)">
          <Image src={series.coverImage} alt="" fill sizes="100vw" className="object-cover" priority />
        </div>
      ) : null}

      <h1 className="text-[clamp(28px,4vw,44px)] font-black">{series.name}</h1>
      {series.description ? <p className="mt-3 max-w-2xl text-(--sub-text)">{series.description}</p> : null}

      {[
        { label: "Upcoming", events: upcoming },
        { label: "Past", events: past },
      ].map(({ label, events }) => {
        if (events.length === 0) return null;
        return (
          <section key={label} className="mt-9">
            <h2 className="mb-4 text-2xl font-extrabold">{label}</h2>
            <div className="space-y-3.5">
              {events.map((e: SeriesEvent) => (
                <Link key={e.id} href={`/events/${e.slug}`} className="flex items-center gap-5 rounded-xl bg-(--card-bg) p-5">
                  <div className="w-20 shrink-0 border-r border-(--border-strong) pr-4 text-center">
                    <div className="text-xs font-extrabold uppercase text-(--primary)">
                      {e.startsAt.toLocaleDateString("en-GB", { month: "short" })}
                    </div>
                    <div className="text-3xl font-black leading-none">{e.startsAt.getDate()}</div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-extrabold">{e.title}</h3>
                    <p className="text-sm text-(--sub-text)">{e.venue}</p>
                  </div>
                  {e.soldOut ? <span className="ml-auto text-[11.5px] font-extrabold uppercase text-(--primary)">Sold out</span> : null}
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
