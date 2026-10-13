import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getActiveTheme, getAlbumStyles } from "@/lib/settings";
import { loadTheme } from "@/components/themes/registry";
import { WidgetSidebar } from "@/components/widgets/Sidebar";
import { AdSlot } from "@/components/ads/AdSlot";
import { TrendingSpotlight } from "@/components/public/albums/TrendingSpotlight";
import { AlbumStrip } from "@/components/public/albums/AlbumStrip";
import { getChart } from "@/lib/albums";
import { getUpcomingEvents } from "@/lib/events";
import { NewsletterSignup } from "@/components/public/NewsletterSignup";
import { ArtistCoverflow, type CoverArtist } from "@/components/public/ArtistCoverflow";
import { EventsSlider } from "@/components/public/events/EventsSlider";
import { EmptyState } from "@/components/ui/EmptyState";
import { WidgetSkeleton } from "@/components/ui/Skeleton";
import type { Story } from "@/components/themes/types";
import Link from "next/link";

export const revalidate = 300;

export const metadata = {
  alternates: { canonical: "/" },
  title: "AfroLitPlaylist — Afro music, artists and events",
  description:
    "New releases, artist profiles, events and episodes from across Afro music.",
};

type PostRow = {
  slug: string; title: string; excerpt: string | null; coverImage: string | null;
  publishedAt: Date | null; category: { name: string } | null;
};

export default async function HomePage() {
  const [themeKey, posts, artistRows, chart, albumStyles, upcoming] = await Promise.all([
    getActiveTheme(),
    prisma.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 10,
      select: {
        slug: true, title: true, excerpt: true, coverImage: true, publishedAt: true,
        category: { select: { name: true } },
      },
    }),
    prisma.artist.findMany({
      where: { status: "LIVE" },
      orderBy: { name: "asc" },
      take: 8,
      select: { slug: true, name: true, genre: true, avatarImage: true, coverImage: true },
    }),
    getChart(6),
    getAlbumStyles(),
    getUpcomingEvents(6),
  ]);

  const artists: CoverArtist[] = artistRows.map((a) => ({
    slug: a.slug,
    name: a.name,
    genre: a.genre,
    image: a.avatarImage || a.coverImage,
  }));

  const { Hero, ArticleCard, SectionHead } = await loadTheme(themeKey);

  const stories: Story[] = (posts as PostRow[]).map((p) => ({
    slug: p.slug, title: p.title, excerpt: p.excerpt, coverImage: p.coverImage,
    publishedAt: p.publishedAt, category: p.category?.name ?? null,
  }));
  const [lead, ...rest] = stories;

  const siteLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "AfroLitPlaylist",
        url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.afrolitplaylist.com",
        potentialAction: {
          "@type": "SearchAction",
          target: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        name: "AfroLitPlaylist",
        url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.afrolitplaylist.com",
      },
    ],
  };

  return (
    <div className="wrap">
      {/* WebSite + Organization: enables the sitelinks search box in Google */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }} />
      {lead ? <Hero lead={lead} secondary={rest.slice(0, 3)} /> : null}

      <AdSlot placement="TOP_LEADERBOARD" path="/" />

      {upcoming.length ? (
        <section className="py-8" aria-labelledby="home-events-title">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-(--primary)">Live · Upcoming</p>
              <h2 id="home-events-title" className="mt-2 text-[clamp(1.7rem,3.8vw,2.4rem)] font-bold tracking-tight">
                Don’t miss the next one
              </h2>
            </div>
            <Link href="/events" className="text-xs font-bold uppercase tracking-wide text-(--primary) hover:underline">
              All events →
            </Link>
          </div>
          <EventsSlider events={upcoming} />
        </section>
      ) : null}

      <ArtistCoverflow artists={artists} />

      {albumStyles[themeKey] === "strip" ? <AlbumStrip albums={chart} /> : <TrendingSpotlight albums={chart} />}

      <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main>
          <SectionHead title="Latest stories" href="/blog" />
          {stories.length === 0 ? (
            <EmptyState
              title="Nothing published yet"
              body="Once the first post goes live it appears here, and the widgets fill in alongside it."
              action={{ href: "/admin/posts/new", label: "Write the first post" }}
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {rest.slice(3).map((s: Story) => <ArticleCard key={s.slug} story={s} />)}
            </div>
          )}

          <AdSlot placement="IN_FEED_NATIVE" path="/" />

          <section className="mt-10 rounded-xl bg-(--surface-alt) p-10 text-center">
            <h2 className="mb-2 text-[clamp(26px,3vw,32px)] font-black">Never miss a drop</h2>
            <NewsletterSignup />
          </section>
        </main>

        {/* Streams in separately: the stories render immediately, widgets follow. */}
        <Suspense fallback={<div className="flex flex-col gap-5"><WidgetSkeleton /><WidgetSkeleton /><WidgetSkeleton /></div>}>
          <WidgetSidebar path="/" />
        </Suspense>
      </div>

      <AdSlot placement="BOTTOM_LEADERBOARD" path="/" />
    </div>
  );
}
