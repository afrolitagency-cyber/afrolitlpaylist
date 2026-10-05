"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRoleFresh, can } from "@/lib/rbac";
import { sendCampaign } from "@/lib/services/email";
import { runAction, type ActionState } from "./_result";

const campaignSchema = z.object({
  id: z.string().cuid().optional(),
  subject: z.string().min(3).max(200),
  previewText: z.string().max(200).optional().nullable(),
  fromName: z.string().max(120).optional().nullable(),
  fromEmail: z.string().email().optional().nullable(),
  body: z.string().max(50_000),
  audienceTag: z.string().max(60).optional().nullable(),
  scheduledAt: z.coerce.date().optional().nullable(),
  schedule: z.boolean().default(false),
});

export async function saveCampaign(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    // sending reaches real inboxes and cannot be undone — ADMIN, checked fresh
    await requireRoleFresh(...can.sendCampaigns);

    const data = campaignSchema.parse({
      id: formData.get("id") || undefined,
      subject: formData.get("subject"),
      previewText: formData.get("previewText") || null,
      fromName: formData.get("fromName") || null,
      fromEmail: formData.get("fromEmail") || null,
      body: formData.get("body") ?? "",
      audienceTag: formData.get("audienceTag") || null,
      scheduledAt: formData.get("scheduledAt") || null,
      schedule: formData.get("schedule") === "on",
    });

    if (data.schedule && !data.scheduledAt) {
      return { ok: false, error: "Pick a send date, or save as a draft instead." };
    }

    const { id, schedule, ...rest } = data;
    const payload = { ...rest, status: schedule ? ("SCHEDULED" as const) : ("DRAFT" as const) };

    if (id) {
      const existing = await prisma.campaign.findUnique({ where: { id }, select: { status: true } });
      // a campaign already sending or sent must never be rewritten underneath itself
      if (existing && ["SENDING", "SENT"].includes(existing.status)) {
        return { ok: false, error: "This campaign has already been sent and can't be edited." };
      }
      await prisma.campaign.update({ where: { id }, data: payload });
    } else {
      await prisma.campaign.create({ data: payload });
    }

    revalidatePath("/admin/newsletter");
    return {
      ok: true,
      message: schedule ? "Scheduled — the cron will send it." : "Draft saved.",
    };
  });
}

export async function sendTestEmail(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await requireRoleFresh(...can.sendCampaigns);
    const subject = String(formData.get("subject") ?? "Test");
    const body = String(formData.get("body") ?? "");
    const token = crypto.randomBytes(16).toString("base64url");

    const ok = await sendCampaign(actor.email, `[Test] ${subject}`, body, token);
    return ok
      ? { ok: true, message: `Test sent to ${actor.email}.` }
      : { ok: false, error: "Email isn't configured, so nothing was sent." };
  });
}
