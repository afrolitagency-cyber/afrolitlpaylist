import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { listenTargets, readLinks, type PlatformKey } from "@/lib/album-platforms";

export type ChartAlbum = {
  slug: string;
  title: string;
  artistName: string;
  artistSlug: string | null;
  releaseYear: number | null;
  genre: string | null;
  summary: string | null;
  trackCount: number;
  coverImage: string | null;
  movement: number;
  platforms: { key: PlatformKey; label: string }[];
};

export const getChart = cache(async (take = 20): Promise<ChartAlbum[]> => {
  const rows = await prisma.album.findMany({
    where: { published: true },
    orderBy: [{ rank: "asc" }, { updatedAt: "desc" }],
    take,
    select: {
      slug: true, title: true, artistName: true, releaseYear: true, genre: true, summary: true,
      tracks: true, coverImage: true, movement: true, links: true,
      artist: { select: { slug: true, status: true } },
    },
  });

  return rows.map((a) => {
    const links = readLinks(a.links);
    return {
      slug: a.slug,
      title: a.title,
      artistName: a.artistName,
      artistSlug: a.artist?.status === "LIVE" ? a.artist.slug : null,
      releaseYear: a.releaseYear,
      genre: a.genre,
      summary: a.summary,
      trackCount: a.tracks.length,
      coverImage: a.coverImage,
      movement: a.movement,
      platforms: listenTargets({ title: a.title, artistName: a.artistName, links }).map(({ key, label }) => ({ key, label })),
    };
  });
});
