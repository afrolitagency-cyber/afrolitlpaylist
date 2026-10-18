"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CampaignKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoleFresh, can } from "@/lib/rbac";
import { sendCampaignEmail } from "@/lib/services/email";
import { archiveSlugFromSubject, campaignHtml, plainTextFromHtml } from "@/lib/newsletter-html";
import { applyMerge, applyMergeText } from "@/lib/newsletter-tokens";
import { freezeCampaignHtml, type CampaignContent } from "@/lib/newsletter-render";
import { runAction, type ActionState } from "./_result";

const kinds = ["BLOG_DIGEST", "EVENTS", "CUSTOM"] as const;

const campaignSchema = z.object({
  id: z.string().cuid().optional(),
  kind: z.enum(kinds).default("CUSTOM"),
  subject: z.string().min(3).max(200),
  previewText: z.string().max(200).optional().nullable(),
  fromName: z.string().max(120).optional().nullable(),
  fromEmail: z.string().email().optional().nullable(),
  body: z.string().max(50_000).optional().default(""),
  intro: z.string().max(500).optional().nullable(),
  heroTitle: z.string().max(160).optional().nullable(),
  kicker: z.string().max(80).optional().nullable(),
  issueLabel: z.string().max(80).optional().nullable(),
  featuredId: z.string().optional().nullable(),
  itemIds: z.array(z.string()).default([]),
  audienceTag: z.string().max(60).optional().nullable(),
  scheduledAt: z.coerce.date().optional().nullable(),
  schedule: z.boolean().default(false),
});

function contentFrom(data: z.infer<typeof campaignSchema>): CampaignContent {
  return {
    featuredId: data.featuredId || undefined,
    itemIds: data.itemIds.filter(Boolean),
    intro: data.intro || undefined,
    heroTitle: data.heroTitle || undefined,
    kicker: data.kicker || undefined,
    issueLabel: data.issueLabel || undefined,
  };
}

async function buildFrozen(
  kind: CampaignKind,
  content: CampaignContent,
  body: string,
  extras: { subject: string; previewText?: string | null; archiveSlug: string },
) {
  const frozen = await freezeCampaignHtml(kind, content, {
    subject: extras.subject,
    previewText: extras.previewText,
    customHtml: body,
    archiveSlug: extras.archiveSlug,
  });
  if (kind === "CUSTOM") {
    const html = campaignHtml(body, frozen?.html);
    if (!html) return null;
    return { html, text: frozen?.text ?? plainTextFromHtml(html) };
  }
  return frozen;
}

export async function saveCampaign(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.sendCampaigns);

    const data = campaignSchema.parse({
      id: formData.get("id") || undefined,
      kind: formData.get("kind") || "CUSTOM",
      subject: formData.get("subject"),
      previewText: formData.get("previewText") || null,
      fromName: formData.get("fromName") || null,
      fromEmail: formData.get("fromEmail") || null,
      body: formData.get("body") ?? "",
      intro: formData.get("intro") || null,
      heroTitle: formData.get("heroTitle") || null,
      kicker: formData.get("kicker") || null,
      issueLabel: formData.get("issueLabel") || null,
      featuredId: formData.get("featuredId") || null,
      itemIds: formData.getAll("itemIds").map(String),
      audienceTag: formData.get("audienceTag") || null,
      scheduledAt: formData.get("scheduledAt") || null,
      schedule: formData.get("schedule") === "on",
    });

    if (data.schedule && !data.scheduledAt) {
      return { ok: false, error: "Pick a send date, or save as a draft instead." };
    }
    if (data.kind !== "CUSTOM" && !data.featuredId) {
      return { ok: false, error: "Pick a featured item for this email." };
    }

    const content = contentFrom(data);
    const { id, schedule, ...rest } = data;

    const existing = id
      ? await prisma.campaign.findUnique({ where: { id }, select: { status: true, archiveSlug: true } })
      : null;
    if (existing && ["SENDING", "SENT", "CANCELED"].includes(existing.status)) {
      return { ok: false, error: "This campaign has already been sent and can't be edited." };
    }

    const archiveSlug = existing?.archiveSlug ?? archiveSlugFromSubject(rest.subject);
    const frozen = await buildFrozen(data.kind, content, rest.body, {
      subject: rest.subject,
      previewText: rest.previewText,
      archiveSlug,
    });
    if (!frozen) return { ok: false, error: "Could not build that email. Check the featured item is published." };

    const payload = {
      kind: data.kind,
      subject: rest.subject,
      previewText: rest.previewText,
      fromName: rest.fromName,
      fromEmail: rest.fromEmail,
      body: rest.body,
      content,
      html: frozen.html,
      text: frozen.text,
      archiveSlug,
      audienceTag: rest.audienceTag,
      scheduledAt: rest.scheduledAt,
      status: schedule ? ("SCHEDULED" as const) : ("DRAFT" as const),
    };

    const saved = id
      ? await prisma.campaign.update({ where: { id }, data: payload })
      : await prisma.campaign.create({ data: payload });

    revalidatePath("/admin/newsletter");
    revalidatePath(`/admin/newsletter/${saved.id}`);
    revalidatePath(`/newsletter/issue/${archiveSlug}`);
    return {
      ok: true,
      id: saved.id,
      message: schedule ? "Scheduled — the cron will send it." : "Draft saved. HTML is frozen from the current picks.",
    };
  });
}

export async function sendTestEmail(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await requireRoleFresh(...can.sendCampaigns);
    const kind = (String(formData.get("kind") || "CUSTOM") as CampaignKind);
    const subject = String(formData.get("subject") ?? "Test");
    const previewText = String(formData.get("previewText") ?? "") || null;
    const body = String(formData.get("body") ?? "");
    const content: CampaignContent = {
      featuredId: String(formData.get("featuredId") || "") || undefined,
      itemIds: formData.getAll("itemIds").map(String),
      intro: String(formData.get("intro") || "") || undefined,
      heroTitle: String(formData.get("heroTitle") || "") || undefined,
      kicker: String(formData.get("kicker") || "") || undefined,
      issueLabel: String(formData.get("issueLabel") || "") || undefined,
    };
    const frozen = await buildFrozen(kind, content, body, {
      subject,
      previewText,
      archiveSlug: "preview",
    });
    const html = frozen?.html ?? campaignHtml(body, body);
    if (!html) return { ok: false, error: "Nothing to send." };
    const subscriberId = "test";
    const list = kind === "BLOG_DIGEST" ? "blog" : kind === "EVENTS" ? "events" : "all";
    const result = await sendCampaignEmail({
      to: actor.email,
      subject: `[Test] ${subject}`,
      html: applyMerge(html, { firstName: actor.email.split("@")[0], subscriberId, list }),
      text: applyMergeText(frozen?.text ?? plainTextFromHtml(html), { firstName: "there", subscriberId, list }),
    });
    return result.ok
      ? { ok: true, message: `Test sent to ${actor.email}. Preference links in tests are placeholders.` }
      : { ok: false, error: "Email isn't configured, so nothing was sent." };
  });
}

export type { CampaignContent };
