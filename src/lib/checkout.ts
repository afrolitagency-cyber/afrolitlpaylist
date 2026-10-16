import { remaining } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { formatTime } from "@/lib/events";
import { HOLD_MS, MAX_TICKETS_PER_ORDER } from "@/lib/ticket-limits";

export { HOLD_MS, MAX_TICKETS_PER_ORDER };

const LOW_LEFT = 20;

export type CheckoutTierStatus = "onsale" | "upcoming" | "soldout" | "ended";

export type CheckoutTier = {
  id: string;
  name: string;
  description: string | null;
  priceKobo: number;
  remaining: number;
  maxPerOrder: number;
  admitsCount: number;
  status: CheckoutTierStatus;
  salesStartsAt: string | null;
  salesEndsAt: string | null;
  tag: string;
  variant: "eb" | "rg" | "vip" | "vv";
};

function variantFor(name: string): CheckoutTier["variant"] {
  const n = name.toLowerCase();
  if (n.includes("vvip") || n.includes("table")) return "vv";
  if (n.includes("vip")) return "vip";
  if (n.includes("early")) return "eb";
  return "rg";
}

function formatWhen(d: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      day: "numeric",
      month: "short",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function classifyTier(
  tier: {
    name: string;
    allocation: number;
    sold: number;
    held: number;
    salesStartsAt: Date | null;
    salesEndsAt: Date | null;
    active: boolean;
    isComp: boolean;
  },
  now = new Date(),
  timeZone = "Africa/Lagos",
): { status: CheckoutTierStatus; tag: string; left: number } | null {
  if (!tier.active || tier.isComp) return null;
  const left = remaining(tier);
  if (tier.salesEndsAt && now > tier.salesEndsAt) {
    return { status: "ended", tag: `${tier.name} ended`, left };
  }
  if (left <= 0) {
    return { status: "soldout", tag: `${tier.name} sold out`, left: 0 };
  }
  if (tier.salesStartsAt && now < tier.salesStartsAt) {
    return { status: "onsale", tag: `from ${formatWhen(tier.salesStartsAt, timeZone)}`, left };
  }
  return {
    status: "onsale",
    tag: left < LOW_LEFT ? `${left} left` : left < 80 ? "Selling fast" : "On sale",
    left,
  };
}

export async function listCheckoutTiers(eventId: string, timeZone: string): Promise<CheckoutTier[]> {
  const rows = await prisma.ticketTier.findMany({
    where: { eventId, active: true, isComp: false },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const now = new Date();
  return rows.flatMap((row) => {
    const classified = classifyTier(row, now, timeZone);
    if (!classified) return [];
    return [{
      id: row.id,
      name: row.name,
      description: row.description,
      priceKobo: row.priceKobo,
      remaining: classified.left,
      maxPerOrder: row.maxPerOrder,
      admitsCount: row.admitsCount,
      status: classified.status,
      salesStartsAt: row.salesStartsAt?.toISOString() ?? null,
      salesEndsAt: row.salesEndsAt?.toISOString() ?? null,
      tag: classified.tag,
      variant: variantFor(row.name),
    }];
  });
}

export async function eventHasCheckout(eventId: string) {
  const n = await prisma.ticketTier.count({
    where: { eventId, active: true, isComp: false },
  });
  return n > 0;
}

export function newOrderReference() {
  return `ALP-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3001").replace(/\/$/, "");
}

export function eventWhenLabel(startsAt: Date, timeZone: string) {
  try {
    const date = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(startsAt);
    return `${date} · ${formatTime(startsAt, timeZone)}`;
  } catch {
    return startsAt.toISOString();
  }
}
