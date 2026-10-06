import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Pagination } from "@/components/ui/Pagination";

export const revalidate = 300;
export const metadata = { title: "Events" };

const PER_PAGE = 20;

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ when?: string; page?: string }> }) {
  const { when, page } = await searchParams;
  const past = when === "past";
  const current = Math.max(1, Number(page ?? 1) || 1);

  const where = { status: "PUBLISHED" as const, startsAt: past ? { lt: new Date() } : { gte: new Date() } };

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { startsAt: past ? "desc" : "asc" },
      skip: (current - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { series: { select: { name: true, slug: true } }, lineup: { select: { name: true, slug: true } } },
    }),
    prisma.event.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="wrap py-8">
      <h1 className="mb-2 text-[clamp(28px,4vw,44px)] font-black">Events</h1>
      <p className="mb-6 text-(--sub-text)">Shows, camps and showcases.</p>

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

      {events.length === 0 ? (
        <p className="text-(--sub-text)">No {past ? "past" : "upcoming"} events.</p>
      ) : (
        <div className="space-y-3.5">
          {events.map((e: {
            id: string; slug: string; title: string; venue: string | null; startsAt: Date; soldOut: boolean;
            coverImage: string | null; registrationOpen: boolean;
            series: { name: string; slug: string } | null; lineup: { name: string; slug: string }[];
          }) => (
            <div key={e.id} className="flex flex-wrap items-center gap-5 rounded-xl bg-(--card-bg) p-5">
              {e.coverImage ? (
                <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-(--surface)">
                  <Image src={e.coverImage} alt="" fill sizes="112px" className="object-cover" />
                </div>
              ) : null}
              <div className="w-20 shrink-0 border-r border-(--border-strong) pr-4 text-center">
                <div className="text-xs font-extrabold uppercase text-(--primary)">
                  {e.startsAt.toLocaleDateString("en-GB", { month: "short" })}
                </div>
                <div className="text-3xl font-black leading-none">{e.startsAt.getDate()}</div>
                <div className="text-[11.5px] text-(--sub-text)">{e.startsAt.getFullYear()}</div>
              </div>

              <div className="min-w-0 flex-1">
                <Link href={`/events/${e.slug}`} className="text-lg font-extrabold hover:text-(--primary)">{e.title}</Link>
                <p className="mt-1 text-sm text-(--sub-text)">{e.venue}</p>
                {e.series ? (
                  <Link href={`/events/series/${e.series.slug}`} className="mt-1 inline-block text-xs font-bold text-(--primary)">
                    {e.series.name}
                  </Link>
                ) : null}
                {e.lineup.length ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {e.lineup.map((a) => (
                      <Link key={a.slug} href={`/artists/${a.slug}`}
                        className="rounded-full bg-(--surface-alt) px-2.5 py-1 text-[11.5px] text-(--sub-text) hover:text-(--primary)">
                        {a.name}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>

              {e.soldOut ? (
                <span className="text-[11.5px] font-extrabold uppercase text-(--primary)">Sold out</span>
              ) : e.registrationOpen ? (
                <Link href={`/events/${e.slug}`} className="rounded bg-(--primary) px-4 py-2.5 text-sm font-semibold text-white">Register</Link>
              ) : null}
            </div>
          ))}
        </div>
      )}
      <Pagination page={current} pages={pages} basePath="/events" params={{ when }} />
    </div>
  );
}
