import { prisma } from "@/lib/prisma";
import { plainSummary } from "@/lib/blocks";

export const revalidate = 900;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.afrolitplaylist.com";

/** Block JSON pays off here: the same stored content feeds the site and the
 *  feed without a second rendering path. */
function escape(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] ?? c,
  );
}

export async function GET() {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 30,
    select: { slug: true, title: true, excerpt: true, body: true, publishedAt: true, category: { select: { name: true } } },
  });

  const items = posts
    .map((p: { slug: string; title: string; excerpt: string | null; body: unknown; publishedAt: Date | null; category: { name: string } | null }) => {
      const description = p.excerpt ?? plainSummary(p.body, 300);
      return `    <item>
      <title>${escape(p.title)}</title>
      <link>${SITE}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE}/blog/${p.slug}</guid>
      ${p.category ? `<category>${escape(p.category.name)}</category>` : ""}
      <pubDate>${(p.publishedAt ?? new Date()).toUTCString()}</pubDate>
      <description>${escape(description)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AfroLitPlaylist</title>
    <link>${SITE}</link>
    <description>Afro music — new releases, artists, events and episodes.</description>
    <language>en</language>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=900" },
  });
}
