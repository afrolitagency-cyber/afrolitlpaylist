import type { CampaignKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { eventSelect, naira, toCard } from "@/lib/events";
import { getIdentity } from "@/lib/settings";
import { plainTextFromHtml, siteUrl } from "@/lib/newsletter-html";
import {
  parseContent,
  renderBlogDigest,
  renderEventsDigest,
  type BlogItem,
  type CampaignContent,
  type EventItem,
} from "@/lib/newsletter-templates";

export type { BlogItem, CampaignContent, EventItem };
export { parseContent, renderBlogDigest, renderEventsDigest };

function readMins(body: unknown) {
  const len = JSON.stringify(body ?? "").length;
  return Math.max(1, Math.round(len / 1500));
}

export function mapPost(p: {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  body: unknown;
  publishedAt: Date | null;
  category: { name: string } | null;
  author: { name: string | null } | null;
}): BlogItem {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    coverImage: p.coverImage,
    category: p.category?.name ?? null,
    author: p.author?.name ?? "the AfroLit team",
    dateLabel: (p.publishedAt ?? new Date()).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    readMins: readMins(p.body),
  };
}

export function mapEvent(row: Prisma.EventGetPayload<{ select: typeof eventSelect }>): EventItem {
  const card = toCard(row);
  const soldOut = card.status === "out";
  const ctaLabel = soldOut
    ? "Join the waitlist"
    : row.ticketed
      ? row.priceFrom
        ? `From ${naira(row.priceFrom)} · Get tickets`
        : "Get tickets"
      : row.registrationOpen
        ? "Free entry · Register"
        : "View event";
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    coverImage: row.coverImage,
    venue: row.venue,
    city: row.city,
    lineup: card.lineup.join(" · "),
    day: card.day,
    month: card.month,
    dateLine: `${card.dateLabel} · ${card.timeLabel}`,
    ctaLabel,
    priceLabel: row.ticketed && row.priceFrom ? naira(row.priceFrom) : null,
    soldOut,
    registrationOpen: row.registrationOpen,
    ticketed: row.ticketed,
  };
}

const postSelect = {
  id: true, slug: true, title: true, excerpt: true, coverImage: true, body: true, publishedAt: true,
  category: { select: { name: true } },
  author: { select: { name: true } },
} satisfies Prisma.PostSelect;

export async function loadBlogItems(ids: string[]) {
  if (!ids.length) return [] as BlogItem[];
  const rows = await prisma.post.findMany({
    where: { id: { in: ids }, status: "PUBLISHED" },
    select: postSelect,
  });
  const byId = new Map(rows.map((r) => [r.id, mapPost(r)]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}

export async function loadEventItems(ids: string[]) {
  if (!ids.length) return [] as EventItem[];
  const rows = await prisma.event.findMany({
    where: { id: { in: ids }, status: "PUBLISHED" },
    select: eventSelect,
  });
  const byId = new Map(rows.map((r) => [r.id, mapEvent(r)]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}

export async function suggestBlogContent(): Promise<CampaignContent> {
  const featured = await prisma.post.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
    select: { id: true },
  });
  const others = await prisma.post.findMany({
    where: { status: "PUBLISHED", ...(featured ? { id: { not: featured.id } } : {}) },
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: { id: true },
  });
  return { featuredId: featured?.id, itemIds: others.map((p) => p.id) };
}

export async function suggestEventsContent(): Promise<CampaignContent> {
  const rows = await prisma.event.findMany({
    where: { status: "PUBLISHED", startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    take: 4,
    select: { id: true },
  });
  return { featuredId: rows[0]?.id, itemIds: rows.slice(1).map((e) => e.id) };
}

export async function freezeCampaignHtml(kind: CampaignKind, content: CampaignContent, extras: {
  subject: string;
  previewText?: string | null;
  customHtml?: string;
  archiveSlug: string;
}) {
  const identity = await getIdentity();
  const socials = identity.socials as Record<string, string | undefined>;
  const browserUrl = `${siteUrl()}/newsletter/issue/${extras.archiveSlug}`;
  const tagline = identity.tagline || "Afrobeats, amapiano and everything that moves you.";

  if (kind === "CUSTOM") {
    const html = (extras.customHtml ?? "").trim();
    return html ? { html, text: plainTextFromHtml(html) } : null;
  }

  if (kind === "BLOG_DIGEST") {
    if (!content.featuredId) return null;
    const [featured, items] = await Promise.all([
      loadBlogItems([content.featuredId]),
      loadBlogItems((content.itemIds ?? []).filter((id) => id !== content.featuredId)),
    ]);
    if (!featured[0]) return null;
    return renderBlogDigest({
      featured: featured[0],
      items,
      intro: content.intro,
      heroTitle: content.heroTitle,
      kicker: content.kicker,
      issueLabel: content.issueLabel,
      preheader: extras.previewText ?? undefined,
      browserUrl,
      socials,
      tagline,
    });
  }

  if (!content.featuredId) return null;
  const [featured, items] = await Promise.all([
    loadEventItems([content.featuredId]),
    loadEventItems((content.itemIds ?? []).filter((id) => id !== content.featuredId)),
  ]);
  if (!featured[0]) return null;
  return renderEventsDigest({
    featured: featured[0],
    items,
    intro: content.intro,
    heroTitle: content.heroTitle,
    kicker: content.kicker,
    issueLabel: content.issueLabel,
    preheader: extras.previewText ?? undefined,
    browserUrl,
    socials,
    tagline,
  });
}
