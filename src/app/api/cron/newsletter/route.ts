import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCron } from "@/lib/cron";
import { sendCampaign } from "@/lib/services/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH = 200;

/**
 * Sends due campaigns in batches. Idempotent: the campaign is marked SENDING
 * before any mail goes out, so a retried invocation cannot double-send.
 */
export async function GET(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;

  const due = await prisma.campaign.findFirst({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    orderBy: { scheduledAt: "asc" },
  });
  if (!due) return NextResponse.json({ sent: 0, reason: "nothing due" });

  const claimed = await prisma.campaign.updateMany({
    where: { id: due.id, status: "SCHEDULED" }, // claim guards against overlap
    data: { status: "SENDING" },
  });
  if (claimed.count === 0) return NextResponse.json({ sent: 0, reason: "already claimed" });

  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { status: "CONFIRMED", ...(due.audienceTag ? { tags: { has: due.audienceTag } } : {}) },
    select: { id: true, email: true },
    take: BATCH,
  });

  let sent = 0;
  for (const sub of subscribers) {
    const token = crypto.randomBytes(24).toString("base64url");
    await prisma.newsletterSubscriber.update({
      where: { id: sub.id },
      data: { tokenHash: crypto.createHash("sha256").update(token).digest("hex") },
    });
    const ok = await sendCampaign(sub.email, due.subject, String(due.body ?? ""), token);
    if (ok) sent += 1;
  }

  await prisma.campaign.update({
    where: { id: due.id },
    data: { status: "SENT", sentAt: new Date(), recipients: sent },
  });

  return NextResponse.json({ campaign: due.id, sent });
}
