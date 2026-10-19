import { z } from "zod";
import type { NewsletterList } from "@/lib/newsletter-tokens";
import { prisma } from "@/lib/prisma";

const emailOk = z.string().email();

export type ImportRow = { email: string; firstName?: string | null; tags?: string[] };

export type ImportSummary = { created: number; updated: number; skipped: number };

function cleanTags(tags: string[] | undefined) {
  const out: string[] = [];
  for (const raw of tags ?? []) {
    const t = raw.trim().slice(0, 40);
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= 12) break;
  }
  return out;
}

export function parseContactText(raw: string): ImportRow[] {
  const seen = new Set<string>();
  const rows: ImportRow[] = [];
  const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const matches = trimmed.match(emailRe) ?? [];
    for (const m of matches) {
      const parsed = emailOk.safeParse(m.toLowerCase());
      if (!parsed.success) continue;
      const email = parsed.data;
      if (seen.has(email)) continue;
      seen.add(email);
      const without = trimmed.replace(emailRe, " ").replace(/[,;|]/g, " ").trim();
      const first = without.split(/\s+/).filter((w) => w && !w.includes("@"))[0] ?? null;
      rows.push({ email, firstName: first && first.length < 80 ? first : null });
    }
  }
  return rows;
}

export async function upsertSubscribers(
  rows: ImportRow[],
  opts: { extraTags?: string[]; confirmed?: boolean; resubscribe?: boolean } = {},
): Promise<ImportSummary> {
  const extra = cleanTags(opts.extraTags);
  const confirmed = opts.confirmed !== false;
  const summary: ImportSummary = { created: 0, updated: 0, skipped: 0 };
  const now = new Date();

  for (const row of rows) {
    const parsed = emailOk.safeParse(row.email.toLowerCase().trim());
    if (!parsed.success) {
      summary.skipped += 1;
      continue;
    }
    const email = parsed.data;
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (existing?.status === "BOUNCED" || existing?.status === "COMPLAINED") {
      summary.skipped += 1;
      continue;
    }
    if (existing?.status === "UNSUBSCRIBED" && !opts.resubscribe) {
      summary.skipped += 1;
      continue;
    }

    const tags = cleanTags([...(existing?.tags ?? []), ...(row.tags ?? []), ...extra]);
    const firstName = row.firstName?.trim().slice(0, 80) || existing?.firstName || null;
    const status = confirmed ? "CONFIRMED" : existing?.status === "CONFIRMED" ? "CONFIRMED" : "PENDING";

    if (!existing) {
      await prisma.newsletterSubscriber.create({
        data: {
          email,
          firstName,
          tags,
          status,
          confirmedAt: status === "CONFIRMED" ? now : null,
          wantsBlog: true,
          wantsEvents: true,
        },
      });
      summary.created += 1;
      continue;
    }

    await prisma.newsletterSubscriber.update({
      where: { id: existing.id },
      data: {
        firstName,
        tags,
        status,
        confirmedAt: status === "CONFIRMED" ? (existing.confirmedAt ?? now) : existing.confirmedAt,
        ...(opts.resubscribe && existing.status === "UNSUBSCRIBED"
          ? { wantsBlog: true, wantsEvents: true }
          : {}),
      },
    });
    summary.updated += 1;
  }

  return summary;
}

export async function applyListPreference(subscriberId: string, list: NewsletterList) {
  const sub = await prisma.newsletterSubscriber.findUnique({ where: { id: subscriberId } });
  if (!sub) return false;
  if (sub.status === "BOUNCED" || sub.status === "COMPLAINED") return true;

  if (list === "all") {
    await prisma.newsletterSubscriber.update({
      where: { id: subscriberId },
      data: { status: "UNSUBSCRIBED", wantsBlog: false, wantsEvents: false },
    });
    return true;
  }

  const wantsBlog = list === "blog" ? false : sub.wantsBlog;
  const wantsEvents = list === "events" ? false : sub.wantsEvents;
  await prisma.newsletterSubscriber.update({
    where: { id: subscriberId },
    data: {
      wantsBlog,
      wantsEvents,
      status: wantsBlog || wantsEvents ? "CONFIRMED" : "UNSUBSCRIBED",
    },
  });
  return true;
}

export async function saveListPreferences(
  subscriberId: string,
  flags: { wantsBlog: boolean; wantsEvents: boolean; firstName?: string | null },
) {
  const sub = await prisma.newsletterSubscriber.findUnique({ where: { id: subscriberId } });
  if (!sub) return false;
  if (sub.status === "BOUNCED" || sub.status === "COMPLAINED") return false;

  const wantsBlog = flags.wantsBlog;
  const wantsEvents = flags.wantsEvents;
  await prisma.newsletterSubscriber.update({
    where: { id: subscriberId },
    data: {
      firstName: flags.firstName === undefined ? undefined : flags.firstName,
      wantsBlog,
      wantsEvents,
      status: wantsBlog || wantsEvents ? "CONFIRMED" : "UNSUBSCRIBED",
    },
  });
  return true;
}
