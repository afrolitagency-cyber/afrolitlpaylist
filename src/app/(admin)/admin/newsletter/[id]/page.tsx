import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, can } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/Shell";
import { CampaignComposer, type CampaignValues } from "@/components/admin/CampaignComposer";
import { eventSelect } from "@/lib/events";
import { mapEvent, mapPost, parseContent, suggestBlogContent } from "@/lib/newsletter-render";
import { formatLagosInput } from "@/lib/newsletter-time";
import { defaultFrom } from "@/lib/services/email";
import type { CampaignKind } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(...can.sendCampaigns);
  const isNew = id === "new";

  const [campaign, recipients, blogCount, eventCount, postRows, eventRows, people, delivered] = await Promise.all([
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
    prisma.newsletterSubscriber.findMany({
      where: { status: "CONFIRMED" },
      orderBy: { email: "asc" },
      take: 500,
      select: { id: true, email: true, firstName: true, tags: true },
    }),
    isNew ? Promise.resolve(0) : prisma.campaignDelivery.count({ where: { campaignId: id, status: "SENT" } }),
  ]);
  if (!isNew && !campaign) notFound();

  const from = defaultFrom();
  const kind: CampaignKind = campaign?.kind ?? "BLOG_DIGEST";
  const suggested = campaign ? parseContent(campaign.content) : await suggestBlogContent();

  const values: CampaignValues = {
    id: campaign?.id,
    kind,
    subject: campaign?.subject ?? "",
    previewText: campaign?.previewText ?? "",
    fromName: campaign?.fromName ?? from.name,
    fromEmail: campaign?.fromEmail ?? from.email,
    body: typeof campaign?.body === "string" ? campaign.body : "",
    audienceTag: campaign?.audienceTag ?? "",
    audienceIds: campaign?.audienceIds ?? [],
    scheduledAt: formatLagosInput(campaign?.scheduledAt ?? null),
    status: campaign?.status ?? "DRAFT",
    intro: suggested.intro ?? "",
    heroTitle: suggested.heroTitle ?? "",
    kicker: suggested.kicker ?? "",
    issueLabel: suggested.issueLabel ?? "",
    featuredId: suggested.featuredId ?? "",
    itemIds: suggested.itemIds ?? [],
    archiveSlug: campaign?.archiveSlug,
    delivered,
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
        people={people.map((p) => ({
          id: p.id,
          email: p.email,
          firstName: p.firstName ?? "",
          tags: p.tags,
        }))}
      />
    </AdminShell>
  );
}
