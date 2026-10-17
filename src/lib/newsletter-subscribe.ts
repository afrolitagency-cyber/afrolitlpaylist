import type { NewsletterList } from "@/lib/newsletter-tokens";
import { prisma } from "@/lib/prisma";

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
