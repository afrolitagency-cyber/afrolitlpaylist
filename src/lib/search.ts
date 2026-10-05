import { prisma } from "@/lib/prisma";

/**
 * Ranked full-text search over the GIN indexes in
 * prisma/migrations/.../search_indexes.
 *
 * websearch_to_tsquery accepts what people actually type — quoted phrases, OR,
 * leading minus — without throwing on syntax the way to_tsquery does. Results
 * are ranked, so the best match leads instead of the most recent.
 */

type Row = { slug: string; title: string; sub: string | null };

export type SearchHit = { kind: "post" | "artist" | "episode" | "event"; slug: string; title: string; sub: string | null };

export async function searchAll(term: string, take = 10): Promise<SearchHit[]> {
  const q = term.trim();
  if (!q) return [];

  const [posts, artists, episodes, events] = await Promise.all([
    prisma.$queryRaw<{ slug: string; title: string; sub: string | null }[]>`
      SELECT slug, title, excerpt AS sub
      FROM "Post"
      WHERE status = 'PUBLISHED'
        AND to_tsvector('english', coalesce(title,'') || ' ' || coalesce(excerpt,''))
            @@ websearch_to_tsquery('english', ${q})
      ORDER BY ts_rank(
        to_tsvector('english', coalesce(title,'') || ' ' || coalesce(excerpt,'')),
        websearch_to_tsquery('english', ${q})
      ) DESC
      LIMIT ${take}`,
    prisma.$queryRaw<{ slug: string; title: string; sub: string | null }[]>`
      SELECT slug, name AS title, genre AS sub
      FROM "Artist"
      WHERE status = 'LIVE'
        AND (
          to_tsvector('english', coalesce(name,'') || ' ' || coalesce(genre,'') || ' ' || coalesce(bio,''))
            @@ websearch_to_tsquery('english', ${q})
          OR name ILIKE ${"%" + q + "%"}
        )
      LIMIT ${take}`,
    prisma.$queryRaw<{ slug: string; title: string; sub: string | null }[]>`
      SELECT slug, title, excerpt AS sub
      FROM "Episode"
      WHERE status = 'PUBLISHED'
        AND to_tsvector('english', coalesce(title,'') || ' ' || coalesce(excerpt,''))
            @@ websearch_to_tsquery('english', ${q})
      LIMIT ${take}`,
    prisma.$queryRaw<{ slug: string; title: string; sub: string | null }[]>`
      SELECT slug, title, venue AS sub
      FROM "Event"
      WHERE status = 'PUBLISHED'
        AND to_tsvector('english', coalesce(title,'') || ' ' || coalesce(venue,''))
            @@ websearch_to_tsquery('english', ${q})
      ORDER BY "startsAt" DESC
      LIMIT ${take}`,
  ]);

  return [
    ...(artists as Row[]).map((r) => ({ kind: "artist" as const, ...r })),
    ...(posts as Row[]).map((r) => ({ kind: "post" as const, ...r })),
    ...(episodes as Row[]).map((r) => ({ kind: "episode" as const, ...r })),
    ...(events as Row[]).map((r) => ({ kind: "event" as const, ...r })),
  ];
}

export const HREF: Record<SearchHit["kind"], (slug: string) => string> = {
  post: (s) => `/blog/${s}`,
  artist: (s) => `/artists/${s}`,
  episode: (s) => `/episodes/${s}`,
  event: (s) => `/events/${s}`,
};
