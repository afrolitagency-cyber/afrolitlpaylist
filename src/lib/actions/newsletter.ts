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
import { parseLagosInput } from "@/lib/newsletter-time";
import { tickNewsletter } from "@/lib/newsletter-tick";
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
  audienceIds: z.array(z.string()).default([]),
  limitAudience: z.boolean().default(false),
  scheduledAt: z.string().optional().nullable(),
  intent: z.enum(["draft", "schedule", "now"]).default("draft"),
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
      fromEmail: String(formData.get("fromEmail") ?? "").trim() || null,
      body: formData.get("body") ?? "",
      intro: formData.get("intro") || null,
      heroTitle: formData.get("heroTitle") || null,
      kicker: formData.get("kicker") || null,
      issueLabel: formData.get("issueLabel") || null,
      featuredId: formData.get("featuredId") || null,
      itemIds: formData.getAll("itemIds").map(String),
      audienceTag: formData.get("audienceTag") || null,
      audienceIds: formData.getAll("audienceIds").map(String).filter(Boolean),
      limitAudience: formData.get("limitAudience") === "on",
      scheduledAt: String(formData.get("scheduledAt") ?? "") || null,
      intent: (["draft", "schedule", "now"].includes(String(formData.get("intent")))
        ? String(formData.get("intent"))
        : "draft") as "draft" | "schedule" | "now",
    });

    if (data.kind !== "CUSTOM" && !data.featuredId) {
      return { ok: false, error: "Pick a featured item for this email." };
    }
    if (data.limitAudience && data.audienceIds.length === 0) {
      return { ok: false, error: "Pick at least one subscriber, or send to the whole list." };
    }

    const scheduledAt = data.intent === "now"
      ? new Date()
      : parseLagosInput(data.scheduledAt);
    if (data.intent === "schedule" && !scheduledAt) {
      return { ok: false, error: "Pick a send date in Africa/Lagos time, or save as a draft." };
    }

    const content = contentFrom(data);
    const { id, intent, limitAudience, ...rest } = data;

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

    const status = intent === "draft" ? ("DRAFT" as const) : ("SCHEDULED" as const);
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
      audienceTag: rest.audienceTag || null,
      audienceIds: limitAudience ? rest.audienceIds : [],
      scheduledAt,
      status,
      enqueueDone: false,
      lastSubscriberId: null,
    };

    const saved = id
      ? await prisma.campaign.update({ where: { id }, data: payload })
      : await prisma.campaign.create({ data: payload });

    revalidatePath("/admin/newsletter");
    revalidatePath(`/admin/newsletter/${saved.id}`);
    revalidatePath(`/newsletter/issue/${archiveSlug}`);

    if (intent === "now") {
      const tick = await tickNewsletter();
      const extra = tick.reason
        ? ` Cron could not start: ${tick.reason}.`
        : tick.sent || tick.enqueued
          ? ` Queued ${tick.enqueued}, sent ${tick.sent}${tick.hasMore ? " — cron will finish the rest." : "."}`
          : tick.hasMore
            ? " Cron will keep draining this send."
            : " Nothing was queued — check the list has confirmed subscribers.";
      return { ok: true, id: saved.id, message: `Sending now.${extra}` };
    }

    return {
      ok: true,
      id: saved.id,
      message: intent === "schedule"
        ? "Scheduled in Africa/Lagos time. Cron-job.org will send it when due — or click Send now."
        : "Draft saved. HTML is frozen from the current picks.",
    };
  });
}

export async function sendCampaignNow(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.sendCampaigns);
    const id = String(formData.get("id") ?? "");
    if (!id) return { ok: false, error: "Save the campaign first." };

    const camp = await prisma.campaign.findUnique({ where: { id } });
    if (!camp) return { ok: false, error: "Campaign not found." };
    if (camp.status === "SENT" || camp.status === "CANCELED") {
      return { ok: false, error: "This campaign has already finished." };
    }
    if (camp.status === "FAILED") {
      return { ok: false, error: "This campaign failed. Save it again as a draft first." };
    }
    if (!campaignHtml(camp.body, camp.html)) {
      return { ok: false, error: "This campaign has no HTML to send. Save it first." };
    }

    if (camp.status === "DRAFT" || camp.status === "SCHEDULED") {
      await prisma.campaign.update({
        where: { id },
        data: {
          status: "SCHEDULED",
          scheduledAt: new Date(),
          enqueueDone: false,
          lastSubscriberId: null,
        },
      });
    }

    const tick = await tickNewsletter();
    revalidatePath("/admin/newsletter");
    revalidatePath(`/admin/newsletter/${id}`);
    if (tick.reason) return { ok: false, error: tick.reason };
    return {
      ok: true,
      id,
      message: `Send started. Queued ${tick.enqueued}, sent ${tick.sent}${tick.hasMore ? " — cron will finish the rest." : "."}`,
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
