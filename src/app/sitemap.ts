import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.afrolitplaylist.com";

export const revalidate = 3600;

/**
 * Generated from live content. Search and the newsletter confirm/unsubscribe
 * pages are deliberately absent: they are either infinite-variant or one-time
 * token URLs, and neither belongs in an index.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, artists, events, series, episodes] = await Promise.all([
    prisma.post.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    prisma.artist.findMany({ where: { status: "LIVE" }, select: { slug: true, updatedAt: true } }),
    prisma.event.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true, startsAt: true } }),
    prisma.eventSeries.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.episode.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
  ]);

  const now = new Date();
  const statics: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/artists`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/events`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/episodes`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/gallery`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  type Row = { slug: string; updatedAt: Date };

  return [
    ...statics,
    ...(posts as Row[]).map((p) => ({
      url: `${base}/blog/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.7,
    })),
    ...(artists as Row[]).map((a) => ({
      url: `${base}/artists/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "weekly" as const, priority: 0.7,
    })),
    // past events drop in priority but stay indexed — they still earn search traffic
    ...(events as (Row & { startsAt: Date })[]).map((e) => ({
      url: `${base}/events/${e.slug}`,
      lastModified: e.updatedAt,
      changeFrequency: "weekly" as const,
      priority: e.startsAt.getTime() >= Date.now() ? 0.8 : 0.4,
    })),
    ...(series as Row[]).map((s) => ({
      url: `${base}/events/series/${s.slug}`, lastModified: s.updatedAt, changeFrequency: "weekly" as const, priority: 0.6,
    })),
    ...(episodes as Row[]).map((e) => ({
      url: `${base}/episodes/${e.slug}`, lastModified: e.updatedAt, changeFrequency: "monthly" as const, priority: 0.6,
    })),
  ];
}
