import crypto from "node:crypto";
import { z } from "zod";
import type { CampaignKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { campaignHtml } from "@/lib/newsletter-html";
import { applyMerge, applyMergeText, manageToken, unsubscribePostUrl, type NewsletterList } from "@/lib/newsletter-tokens";
import { sendCampaignBatch, sendCampaignEmail } from "@/lib/services/email";

const ENQUEUE_PAGE = 200;
const SEND_CHUNK = 100;
const MAX_ATTEMPTS = 5;
const STALE_MS = 10 * 60 * 1000;
const emailOk = z.string().email();

type TickSummary = {
  sent: number;
  enqueued: number;
  skipped: number;
  hasMore: boolean;
  reason?: string;
};

function budgetMs() {
  const n = Number(process.env.CRON_BUDGET_MS ?? 8000);
  return Number.isFinite(n) && n > 1000 ? n : 8000;
}

function listForKind(kind: CampaignKind): NewsletterList {
  if (kind === "BLOG_DIGEST") return "blog";
  if (kind === "EVENTS") return "events";
  return "all";
}

function fromHeader(fromName: string | null, fromEmail: string | null) {
  const fallback = process.env.RESEND_FROM ?? "AfroLitPlaylist <hello@afrolitplaylist.com>";
  if (!fromEmail) return fallback;
  return fromName ? `${fromName} <${fromEmail}>` : fromEmail;
}

function idempotencyKey(campaignId: string, ids: string[]) {
  const h = crypto.createHash("sha256").update(ids.slice().sort().join(",")).digest("hex").slice(0, 24);
  return `alp-${campaignId}-${h}`;
}

export async function tickNewsletter(started = Date.now()): Promise<TickSummary> {
  const limit = started + budgetMs();
  const summary: TickSummary = { sent: 0, enqueued: 0, skipped: 0, hasMore: false };

  if (!process.env.NEWSLETTER_SECRET) {
    return { ...summary, reason: "NEWSLETTER_SECRET missing" };
  }

  await reclaimStale();
  summary.enqueued += await enqueueDue(limit);

  while (Date.now() < limit - 1500) {
    const camp = await prisma.campaign.findFirst({
      where: { status: "SENDING" },
      orderBy: { scheduledAt: "asc" },
    });
    if (!camp) break;

    const html = campaignHtml(camp.body, camp.html);
    if (!html) {
      await prisma.campaign.update({
        where: { id: camp.id },
        data: { status: "FAILED" },
      });
      continue;
    }

    const rows = await claimDeliveries(camp.id, SEND_CHUNK);
    if (!rows.length) {
      if (!camp.enqueueDone) {
        summary.hasMore = true;
        break;
      }
      await finishIfDone(camp.id);
      continue;
    }

    const result = await sendChunk(camp, html, rows);
    summary.sent += result.sent;
    summary.skipped += result.skipped;
    await finishIfDone(camp.id);
  }

  const leftover = await prisma.campaign.count({
    where: { OR: [{ status: "SCHEDULED", scheduledAt: { lte: new Date() } }, { status: "SENDING" }] },
  });
  summary.hasMore = leftover > 0;
  return summary;
}

async function reclaimStale() {
  const cutoff = new Date(Date.now() - STALE_MS);
  await prisma.campaignDelivery.updateMany({
    where: { status: "SENDING", claimedAt: { lt: cutoff }, attempts: { lt: MAX_ATTEMPTS } },
    data: { status: "PENDING", claimedAt: null },
  });
  await prisma.campaignDelivery.updateMany({
    where: { status: "SENDING", claimedAt: { lt: cutoff }, attempts: { gte: MAX_ATTEMPTS } },
    data: { status: "FAILED", error: "stale claim" },
  });
}

async function enqueueDue(until: number) {
  let enqueued = 0;
  const due = await prisma.campaign.findFirst({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    orderBy: { scheduledAt: "asc" },
  });
  if (due) {
    if (!campaignHtml(due.body, due.html)) {
      await prisma.campaign.update({ where: { id: due.id }, data: { status: "FAILED" } });
    } else {
      await prisma.campaign.updateMany({
        where: { id: due.id, status: "SCHEDULED" },
        data: { status: "SENDING", enqueueDone: false, lastSubscriberId: null },
      });
    }
  }

  const sending = await prisma.campaign.findMany({
    where: { status: "SENDING", enqueueDone: false },
    orderBy: { scheduledAt: "asc" },
    take: 3,
  });

  for (const camp of sending) {
    while (Date.now() < until - 1500) {
      const n = await enqueuePage(camp.id);
      enqueued += n.created;
      if (n.done) break;
    }
  }
  return enqueued;
}

async function enqueuePage(campaignId: string) {
  const camp = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      lastSubscriberId: true,
      enqueueDone: true,
      kind: true,
      audienceTag: true,
      audienceIds: true,
    },
  });
  if (!camp || camp.enqueueDone) return { created: 0, done: true };

  const after = camp.lastSubscriberId;
  const picked = camp.audienceIds.filter(Boolean);
  const idFilter = {
    ...(picked.length ? { in: picked } : {}),
    ...(after ? { gt: after } : {}),
  };
  const subs = await prisma.newsletterSubscriber.findMany({
    where: {
      status: "CONFIRMED",
      ...(Object.keys(idFilter).length ? { id: idFilter } : {}),
      ...(!picked.length && camp.kind === "BLOG_DIGEST" ? { wantsBlog: true } : {}),
      ...(!picked.length && camp.kind === "EVENTS" ? { wantsEvents: true } : {}),
      ...(!picked.length && camp.audienceTag ? { tags: { has: camp.audienceTag } } : {}),
    },
    select: { id: true, email: true },
    orderBy: { id: "asc" },
    take: ENQUEUE_PAGE,
  });

  if (!subs.length) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { enqueueDone: true } });
    return { created: 0, done: true };
  }

  const rows = subs.map((s) => {
    const valid = emailOk.safeParse(s.email).success;
    return {
      campaignId,
      subscriberId: s.id,
      status: valid ? ("PENDING" as const) : ("SKIPPED" as const),
      error: valid ? null : "invalid email",
    };
  });

  await prisma.campaignDelivery.createMany({ data: rows, skipDuplicates: true });
  const lastId = subs[subs.length - 1]!.id;
  const done = subs.length < ENQUEUE_PAGE;
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { lastSubscriberId: lastId, enqueueDone: done },
  });
  return { created: rows.length, done };
}

async function claimDeliveries(campaignId: string, limit: number) {
  return prisma.$transaction(async (tx) => {
    return tx.$queryRaw<Array<{ id: string; subscriberId: string }>>`
      UPDATE "CampaignDelivery"
      SET status = CAST('SENDING' AS "DeliveryStatus"), "claimedAt" = NOW(), attempts = attempts + 1
      WHERE id IN (
        SELECT id FROM "CampaignDelivery"
        WHERE "campaignId" = ${campaignId}
          AND status = CAST('PENDING' AS "DeliveryStatus")
          AND attempts < ${MAX_ATTEMPTS}
        ORDER BY id
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, "subscriberId"
    `;
  });
}

async function sendChunk(
  camp: {
    id: string;
    kind: CampaignKind;
    subject: string;
    previewText: string | null;
    fromName: string | null;
    fromEmail: string | null;
    text: string | null;
  },
  html: string,
  rows: Array<{ id: string; subscriberId: string }>,
) {
  const list = listForKind(camp.kind);
  const subs = await prisma.newsletterSubscriber.findMany({
    where: { id: { in: rows.map((r) => r.subscriberId) } },
  });
  const byId = new Map(subs.map((s) => [s.id, s]));

  const ready: typeof rows = [];
  let skipped = 0;
  for (const row of rows) {
    const sub = byId.get(row.subscriberId);
    const stillWants =
      sub?.status === "CONFIRMED" &&
      (camp.kind === "CUSTOM" ||
        (camp.kind === "BLOG_DIGEST" && sub.wantsBlog) ||
        (camp.kind === "EVENTS" && sub.wantsEvents));
    if (!sub || !stillWants) {
      await prisma.campaignDelivery.update({
        where: { id: row.id },
        data: { status: "SKIPPED", error: "not on list" },
      });
      skipped += 1;
      continue;
    }
    if (!manageToken(sub.id)) {
      await prisma.campaignDelivery.update({
        where: { id: row.id },
        data: { status: "FAILED", error: "NEWSLETTER_SECRET missing" },
      });
      skipped += 1;
      continue;
    }
    ready.push(row);
  }

  if (!ready.length) return { sent: 0, skipped };

  const mails = ready.map((row) => {
    const sub = byId.get(row.subscriberId)!;
    const unsubPost = unsubscribePostUrl(sub.id, list);
    return {
      rowId: row.id,
      to: sub.email,
      subject: camp.subject,
      from: fromHeader(camp.fromName, camp.fromEmail),
      html: applyMerge(html, { firstName: sub.firstName, subscriberId: sub.id, list }),
      text: applyMergeText(camp.text || "", { firstName: sub.firstName, subscriberId: sub.id, list }),
      headers: {
        "List-Unsubscribe": `<${unsubPost}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      idempotencyKey: idempotencyKey(camp.id, [row.id]),
    };
  });

  const batchKey = idempotencyKey(camp.id, ready.map((r) => r.id));
  const batch = await sendCampaignBatch(
    mails.map(({ rowId: _r, idempotencyKey: _i, ...m }) => ({ ...m, idempotencyKey: batchKey })),
  );

  if (batch.ok) {
    let sent = 0;
    for (let i = 0; i < ready.length; i += 1) {
      await prisma.campaignDelivery.update({
        where: { id: ready[i]!.id },
        data: { status: "SENT", providerId: batch.ids[i] ?? null, error: null },
      });
      sent += 1;
    }
    return { sent, skipped };
  }

  let sent = 0;
  for (const mail of mails) {
    const one = await sendCampaignEmail({
      to: mail.to,
      subject: mail.subject,
      from: mail.from,
      html: mail.html,
      text: mail.text,
      headers: mail.headers,
      idempotencyKey: mail.idempotencyKey,
    });
    await prisma.campaignDelivery.update({
      where: { id: mail.rowId },
      data: one.ok
        ? { status: "SENT", providerId: one.id ?? null, error: null }
        : { status: "PENDING", error: one.error ?? batch.error ?? "send failed" },
    });
    if (one.ok) sent += 1;
    else {
      const row = await prisma.campaignDelivery.findUnique({ where: { id: mail.rowId }, select: { attempts: true } });
      if ((row?.attempts ?? 0) >= MAX_ATTEMPTS) {
        await prisma.campaignDelivery.update({
          where: { id: mail.rowId },
          data: { status: "FAILED", error: one.error ?? "max attempts" },
        });
      }
    }
  }
  return { sent, skipped };
}

async function finishIfDone(campaignId: string) {
  const open = await prisma.campaignDelivery.count({
    where: { campaignId, status: { in: ["PENDING", "SENDING"] } },
  });
  const camp = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { enqueueDone: true },
  });
  if (!camp?.enqueueDone || open > 0) return;

  const sent = await prisma.campaignDelivery.count({
    where: { campaignId, status: "SENT" },
  });
  await prisma.campaign.update({
    where: { id: campaignId },
    data: sent > 0
      ? { status: "SENT", sentAt: new Date(), recipients: sent }
      : { status: "FAILED", recipients: 0 },
  });
}
