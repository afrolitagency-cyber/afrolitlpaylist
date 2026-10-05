import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * One source per widget seen in the homepage templates. Each returns a plain
 * shape the component renders, so a widget never reaches into Prisma itself.
 *
 * Every query here is allowed to return an empty array. Components show a
 * written empty state in that case — placeholder rows are only ever used while
 * a segment is streaming, never to imply data that doesn't exist.
 */

export type TrendingItem = { rank: number; title: string; sub: string; href: string; image: string | null };
export type EventItem = { slug: string; title: string; date: string; venue: string; image: string | null };
export type NowPlaying = { title: string; artist: string; artistSlug: string | null; audioUrl: string | null; image: string | null } | null;
export type AlbumItem = { title: string; artist: string; artistSlug: string; year: string; cover: string | null; href: string };
export type ListenLink = { service: "spotify" | "youtube"; label: string; sub: string; href: string };

/** Trending = most-viewed published posts this week, falling back to all-time
 *  so a brand-new site still has something to show. */
export const getTrending = cache(async (take = 3): Promise<TrendingItem[]> => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const weekly = await prisma.post.findMany({
    where: { status: "PUBLISHED", publishedAt: { gte: since } },
    orderBy: { viewCount: "desc" },
    take,
    select: { slug: true, title: true, viewCount: true, coverImage: true, artist: { select: { name: true } } },
  });

  const rows =
    weekly.length > 0
      ? weekly
      : await prisma.post.findMany({
          where: { status: "PUBLISHED" },
          orderBy: { viewCount: "desc" },
          take,
          select: { slug: true, title: true, viewCount: true, coverImage: true, artist: { select: { name: true } } },
        });

  return rows.map((p: { slug: string; title: string; viewCount: number; coverImage: string | null; artist: { name: string } | null }, i: number) => ({
    rank: i + 1,
    title: p.title,
    sub: p.artist?.name ?? `${p.viewCount.toLocaleString()} reads`,
    href: `/blog/${p.slug}`,
    image: p.coverImage,
  }));
});

export const getUpcomingEvents = cache(async (take = 3): Promise<EventItem[]> => {
  const rows = await prisma.event.findMany({
    where: { status: "PUBLISHED", startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    take,
    select: { slug: true, title: true, startsAt: true, venue: true, country: true, coverImage: true },
  });

  return rows.map((e: { slug: string; title: string; startsAt: Date; venue: string | null; country: string | null; coverImage: string | null }) => ({
    slug: e.slug,
    title: e.title,
    date: e.startsAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    venue: [e.venue, e.country].filter(Boolean).join(", "),
    image: e.coverImage,
  }));
});

/** "Now playing" = the newest published episode, else the newest release with
 *  audio. Editorial can override by featuring an episode. */
export const getNowPlaying = cache(async (): Promise<NowPlaying> => {
  const featured = await prisma.episode.findFirst({
    where: { status: "PUBLISHED", audioUrl: { not: null } },
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
    select: { title: true, audioUrl: true, coverImage: true },
  });
  if (featured) {
    return { title: featured.title, artist: "AfroLitPlaylist", artistSlug: null, audioUrl: featured.audioUrl, image: featured.coverImage };
  }

  const release = await prisma.discography.findFirst({
    where: { published: true, streamUrl: { not: null } },
    orderBy: { releaseDate: "desc" },
    select: { title: true, coverArt: true, streamUrl: true, artist: { select: { name: true, slug: true } } },
  });
  if (!release) return null;

  return {
    title: release.title,
    artist: release.artist.name,
    artistSlug: release.artist.slug,
    audioUrl: release.streamUrl,
    image: release.coverArt,
  };
});

/** Trending albums strip (Street template). */
export const getTrendingAlbums = cache(async (take = 5): Promise<AlbumItem[]> => {
  const rows = await prisma.discography.findMany({
    where: { published: true, artist: { status: "LIVE" } },
    orderBy: { releaseDate: "desc" },
    take,
    select: { title: true, coverArt: true, releaseDate: true, artist: { select: { name: true, slug: true } } },
  });

  return rows.map((d: { title: string; coverArt: string | null; releaseDate: Date | null; artist: { name: string; slug: string } }) => ({
    title: d.title,
    artist: d.artist.name,
    artistSlug: d.artist.slug,
    year: d.releaseDate ? String(d.releaseDate.getFullYear()) : "",
    cover: d.coverArt,
    href: `/artists/${d.artist.slug}`,
  }));
});

/** "Listen on" comes from site settings, so it is editable without a deploy. */
export const getListenLinks = cache(async (): Promise<ListenLink[]> => {
  const row = await prisma.siteSetting.findUnique({ where: { key: "site.listen" } });
  const value = (row?.value ?? {}) as { spotify?: string; youtube?: string };

  const links: ListenLink[] = [];
  if (value.spotify) links.push({ service: "spotify", label: "AfroLit New Music Friday", sub: "Spotify playlist", href: value.spotify });
  if (value.youtube) links.push({ service: "youtube", label: "AfroLit Sessions", sub: "YouTube · latest episode", href: value.youtube });
  return links;
});
