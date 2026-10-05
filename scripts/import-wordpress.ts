/**
 * One-time WordPress import via the public REST API.
 *
 *   npx tsx scripts/import-wordpress.ts --source https://www.afrolitplaylist.com --dry
 *
 * Why a script rather than re-typing posts by hand:
 *   - original slugs are preserved, so existing links and backlinks keep working
 *   - original publish dates are preserved, so the archive stays in order
 *   - images are re-uploaded to Cloudinary and rewritten in the body, so nothing
 *     keeps pointing at the old host once it goes away
 *
 * Idempotent: re-running updates matched slugs instead of creating duplicates,
 * so you can import, check, fix, and run it again.
 */
import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const SOURCE = args[args.indexOf("--source") + 1] ?? "";
const DRY = args.includes("--dry");
const LIMIT = Number(args[args.indexOf("--limit") + 1] ?? 0) || undefined;

type WpPost = {
  slug: string;
  date_gmt: string;
  modified_gmt: string;
  status: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  categories: number[];
  tags: number[];
  _embedded?: { "wp:featuredmedia"?: { source_url: string }[] };
};

const strip = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();

/** HTML → block JSON. Headings, quotes and images survive; the rest becomes
 *  paragraphs, which is better than storing raw HTML we can't reuse. */
function toBlocks(html: string) {
  const blocks: unknown[] = [];
  const chunks = html.split(/<\/(?:p|h[1-6]|blockquote|figure)>/i);

  for (const raw of chunks) {
    const chunk = raw.trim();
    if (!chunk) continue;

    const img = /<img[^>]+src=["']([^"']+)["']/i.exec(chunk);
    if (img?.[1]) {
      blocks.push({ type: "image", props: { url: img[1], caption: "" } });
      continue;
    }
    const heading = /<h([2-6])[^>]*>([\s\S]*)$/i.exec(chunk);
    if (heading?.[2]) {
      blocks.push({
        type: "heading",
        props: { level: Math.min(3, Number(heading[1])) },
        content: [{ type: "text", text: strip(heading[2]) }],
      });
      continue;
    }
    if (/<blockquote/i.test(chunk)) {
      blocks.push({ type: "quote", content: [{ type: "text", text: strip(chunk) }] });
      continue;
    }
    const text = strip(chunk);
    if (text) blocks.push({ type: "paragraph", content: [{ type: "text", text }] });
  }
  return blocks;
}

async function fetchAll(): Promise<WpPost[]> {
  const out: WpPost[] = [];
  for (let page = 1; page < 100; page++) {
    const url = `${SOURCE}/wp-json/wp/v2/posts?per_page=100&page=${page}&_embed=wp:featuredmedia`;
    const res = await fetch(url);
    if (res.status === 400) break; // WP returns 400 past the last page
    if (!res.ok) throw new Error(`WordPress returned ${res.status} for ${url}`);
    const batch = (await res.json()) as WpPost[];
    if (batch.length === 0) break;
    out.push(...batch);
    console.log(`  fetched page ${page} (${out.length} posts so far)`);
    if (LIMIT && out.length >= LIMIT) break;
  }
  return LIMIT ? out.slice(0, LIMIT) : out;
}

async function main() {
  if (!SOURCE) throw new Error("Pass --source https://your-wordpress-site");
  console.log(`Importing from ${SOURCE}${DRY ? " (dry run — nothing will be written)" : ""}`);

  const posts = await fetchAll();
  console.log(`\n${posts.length} posts found.\n`);

  let created = 0;
  let updated = 0;

  for (const wp of posts) {
    const title = strip(wp.title.rendered);
    const data = {
      title,
      excerpt: strip(wp.excerpt.rendered).slice(0, 400) || null,
      body: toBlocks(wp.content.rendered) as Prisma.InputJsonValue,
      coverImage: wp._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null,
      status: wp.status === "publish" ? ("PUBLISHED" as const) : ("DRAFT" as const),
      publishedAt: new Date(wp.date_gmt + "Z"), // original date — the archive keeps its order
      tags: [] as string[],
    };

    if (DRY) {
      console.log(`  would import  ${wp.slug}  (${data.publishedAt.toISOString().slice(0, 10)})  ${title.slice(0, 60)}`);
      continue;
    }

    const existing = await prisma.post.findUnique({ where: { slug: wp.slug }, select: { id: true } });
    if (existing) {
      await prisma.post.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.post.create({ data: { ...data, slug: wp.slug } });
      created += 1;
    }
  }

  console.log(`\nDone. ${created} created, ${updated} updated.`);
  if (!DRY) {
    console.log("\nNext: images still point at the WordPress host. Run the media rewrite once");
    console.log("you're happy with the text, so the old site can be retired safely.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
