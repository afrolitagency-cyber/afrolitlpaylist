/**
 * WordPress import via the public REST API.
 *
 *   node --env-file=.env ./node_modules/tsx/dist/cli.mjs scripts/import-wordpress.ts \
 *     --source https://www.afrolitplaylist.com --year 2022 --only-new
 *
 *   Add --dry to list posts without writing.
 *
 * Original slugs and publish dates are kept, so old links still resolve.
 * --only-new leaves posts that are already here untouched.
 * Pictures are copied to Cloudinary. A dry run does not upload.
 */
import crypto from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function withDb<T>(run: () => Promise<T>, label: string): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await run();
    } catch (err) {
      last = err;
      const message = err instanceof Error ? err.message : "";
      const retryable = /connection pool|Can't reach database|timed out|timeout|ECONNRESET|closed the connection/i.test(message);
      if (!retryable || attempt === 4) throw err;
      console.log(`  retrying database (${label}, attempt ${attempt})`);
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
  throw last;
}

const args = process.argv.slice(2);

function flag(name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const SOURCE = flag("--source") ?? "";
const DRY = args.includes("--dry");
const ONLY_NEW = args.includes("--only-new");
const YEAR = Number(flag("--year") ?? 0) || undefined;
const LIMIT = Number(flag("--limit") ?? 0) || undefined;
const TAKE = Number(flag("--take") ?? 0) || undefined;
/** Same incoming transform as the editor upload. Wide originals are stored smaller. */
const IMAGE_TRANSFORM = "c_limit,w_2000,q_auto:good";

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

function strip(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** HTML → block JSON. Headings, quotes and images survive; the rest becomes
 *  paragraphs, which is better than storing raw HTML we can't reuse. */
function toBlocks(html: string) {
  const blocks: unknown[] = [];
  const chunks = html.split(/<\/(?:p|h[1-6]|blockquote|figure)>/i);

  for (const raw of chunks) {
    const chunk = raw.trim();
    if (!chunk) continue;

    const iframe = /<iframe[^>]+src=["']([^"']+)["']/i.exec(chunk);
    if (iframe?.[1] && /youtube\.com|youtu\.be|open\.spotify\.com|embed\.music\.apple\.com/i.test(iframe[1])) {
      blocks.push({ type: "video", props: { url: iframe[1], caption: "" } });
      continue;
    }
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
    const range = YEAR ? `&after=${YEAR}-01-01T00:00:00&before=${YEAR + 1}-01-01T00:00:00` : "";
    const url = `${SOURCE}/wp-json/wp/v2/posts?per_page=100&page=${page}&_embed=wp:featuredmedia${range}`;
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

const copied = new Map<string, string>();

/** Copies a WordPress picture to Cloudinary. The same address is uploaded once. */
async function toCloudinary(url: string): Promise<string> {
  if (!/^https?:\/\//.test(url) || url.includes("res.cloudinary.com")) return url;
  const hit = copied.get(url);
  if (hit) return hit;

  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !apiKey || !secret) throw new Error("Cloudinary is not configured.");

  const file = await fetch(url);
  if (!file.ok) throw new Error(`Picture returned ${file.status}: ${url}`);
  const bytes = new Uint8Array(await file.arrayBuffer());

  const folder = "afrolit/wordpress";
  const publicId = crypto.createHash("sha1").update(url).digest("hex").slice(0, 24);
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = [`folder=${folder}`, "overwrite=1", `public_id=${publicId}`, `timestamp=${timestamp}`, `transformation=${IMAGE_TRANSFORM}`]
    .sort()
    .join("&");
  const signature = crypto.createHash("sha1").update(`${toSign}${secret}`).digest("hex");

  const body = new FormData();
  body.append("file", new Blob([bytes]), "image");
  body.append("api_key", apiKey);
  body.append("timestamp", String(timestamp));
  body.append("folder", folder);
  body.append("public_id", publicId);
  body.append("overwrite", "1");
  body.append("transformation", IMAGE_TRANSFORM);
  body.append("signature", signature);

  const up = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body });
  const data = (await up.json().catch(() => null)) as { secure_url?: string; public_id?: string; bytes?: number; error?: { message?: string } } | null;
  if (!data?.secure_url || !data.public_id) {
    throw new Error(data?.error?.message || `Cloudinary rejected ${url}`);
  }

  await withDb(
    () => prisma.mediaAsset.upsert({
      where: { publicId: data.public_id },
      update: { url: data.secure_url, bytes: data.bytes ?? null },
      create: { url: data.secure_url, publicId: data.public_id, kind: "image", bytes: data.bytes ?? null },
    }),
    "picture record",
  );
  copied.set(url, data.secure_url);
  return data.secure_url;
}

async function main() {
  if (!SOURCE) throw new Error("Pass --source https://your-wordpress-site");
  console.log(
    `Importing from ${SOURCE}${YEAR ? ` (${YEAR})` : ""}${ONLY_NEW ? ", new posts only" : ""}${TAKE ? `, up to ${TAKE} new` : ""}${DRY ? " (dry run — nothing will be written)" : ""}`,
  );

  const posts = await fetchAll();
  console.log(`\n${posts.length} posts found.\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const wp of posts) {
    const title = strip(wp.title.rendered);
    const publishedAt = new Date(wp.date_gmt + "Z");
    const existing = await withDb(
      () => prisma.post.findUnique({ where: { slug: wp.slug }, select: { id: true } }),
      wp.slug,
    );
    if (existing && ONLY_NEW) {
      skipped += 1;
      console.log(`  kept        ${wp.slug}`);
      continue;
    }

    const body = toBlocks(wp.content.rendered) as { type?: string; props?: { url?: string }; content?: { text?: string }[] }[];
    const hasText = Boolean(title) || body.some((block) => block.content?.some((part) => part.text?.trim()) || (block.type === "image" && block.props?.url));
    if (!hasText) {
      skipped += 1;
      console.log(`  skipped     ${wp.slug} (empty on WordPress)`);
      continue;
    }

    let cover = wp._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;
    if (!DRY) {
      if (cover) cover = await toCloudinary(cover);
      for (const block of body) {
        if (block.type === "image" && block.props?.url) block.props.url = await toCloudinary(block.props.url);
      }
    }

    const data = {
      title,
      excerpt: strip(wp.excerpt.rendered).slice(0, 400) || null,
      body: body as Prisma.InputJsonValue,
      coverImage: cover,
      status: wp.status === "publish" ? ("PUBLISHED" as const) : ("DRAFT" as const),
      publishedAt,
      tags: [] as string[],
    };

    if (DRY) {
      console.log(`  would import  ${wp.slug}  (${publishedAt.toISOString().slice(0, 10)})  ${title.slice(0, 60)}`);
      continue;
    }

    if (existing) {
      await withDb(() => prisma.post.update({ where: { id: existing.id }, data }), wp.slug);
      updated += 1;
    } else {
      await withDb(() => prisma.post.create({ data: { ...data, slug: wp.slug } }), wp.slug);
      created += 1;
    }
    console.log(`  ${existing ? "updated" : "created"}     ${wp.slug}`);
    if (TAKE && created >= TAKE) break;
  }

  console.log(`\nDone. ${created} created, ${updated} updated, ${skipped} left as they were. ${copied.size} pictures copied.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
