import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { CampaignComposer, type CampaignValues } from "@/components/admin/CampaignComposer";
import { eventSelect } from "@/lib/events";
import { mapEvent, mapPost, parseContent, suggestBlogContent } from "@/lib/newsletter-render";
import type { CampaignKind } from "@prisma/client";

export const dynamic = "force-dynamic";

function forInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(...can.sendCampaigns);
  const isNew = id === "new";

  const [campaign, recipients, blogCount, eventCount, postRows, eventRows] = await Promise.all([
    isNew ? null : prisma.campaign.findUnique({ where: { id } }),
    prisma.newsletterSubscriber.count({ where: { status: "CONFIRMED" } }),
    prisma.newsletterSubscriber.count({ where: { status: "CONFIRMED", wantsBlog: true } }),
    prisma.newsletterSubscriber.count({ where: { status: "CONFIRMED", wantsEvents: true } }),
    prisma.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 30,
      select: {
        id: true, slug: true, title: true, excerpt: true, coverImage: true, body: true, publishedAt: true,
        category: { select: { name: true } },
        author: { select: { name: true } },
      },
    }),
    prisma.event.findMany({
      where: { status: "PUBLISHED", startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 30,
      select: eventSelect,
    }),
  ]);
  if (!isNew && !campaign) notFound();

  const kind: CampaignKind = campaign?.kind ?? "BLOG_DIGEST";
  const suggested = campaign ? parseContent(campaign.content) : await suggestBlogContent();

  const values: CampaignValues = {
    id: campaign?.id,
    kind,
    subject: campaign?.subject ?? "",
    previewText: campaign?.previewText ?? "",
    fromName: campaign?.fromName ?? "",
    fromEmail: campaign?.fromEmail ?? "",
    body: typeof campaign?.body === "string" ? campaign.body : "",
    audienceTag: campaign?.audienceTag ?? "",
    scheduledAt: forInput(campaign?.scheduledAt ?? null),
    status: campaign?.status ?? "DRAFT",
    intro: suggested.intro ?? "",
    heroTitle: suggested.heroTitle ?? "",
    kicker: suggested.kicker ?? "",
    issueLabel: suggested.issueLabel ?? "",
    featuredId: suggested.featuredId ?? "",
    itemIds: suggested.itemIds ?? [],
    archiveSlug: campaign?.archiveSlug,
  };

  return (
    <AdminShell role={user.role} email={user.email} title={isNew ? "New campaign" : "Edit campaign"}
      subtitle={campaign?.subject ?? "Draft"}>
      <CampaignComposer
        values={values}
        recipients={recipients}
        blogCount={blogCount}
        eventCount={eventCount}
        posts={postRows.map(mapPost)}
        events={eventRows.map(mapEvent)}
      />
    </AdminShell>
  );
}
