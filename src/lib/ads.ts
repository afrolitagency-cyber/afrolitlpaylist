import { cache } from "react";
import type { AdCreative, AdPlacement, AdSlot } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SETTING_KEYS } from "@/lib/settings";

export type AdSlotWithCreatives = AdSlot & { creatives: AdCreative[] };

export const AD_PLACEMENTS = [
  "TOP_LEADERBOARD",
  "IN_FEED_NATIVE",
  "SIDEBAR_RECTANGLE",
  "BOTTOM_LEADERBOARD",
] as const;

export const AD_SIZES: Record<
  AdPlacement,
  { w: number; h: number; mw: number; mh: number; label: string } | null
> = {
  TOP_LEADERBOARD: { w: 970, h: 90, mw: 320, mh: 100, label: "Advertisement" },
  BOTTOM_LEADERBOARD: { w: 970, h: 250, mw: 320, mh: 100, label: "Advertisement" },
  SIDEBAR_RECTANGLE: { w: 300, h: 250, mw: 300, mh: 250, label: "Advertisement" },
  IN_FEED_NATIVE: null,
};

export const AD_PLACEMENT_COPY: Record<AdPlacement, { name: string; size: string }> = {
  TOP_LEADERBOARD: { name: "Top leaderboard", size: "970 × 90 desktop · 320 × 100 phone" },
  BOTTOM_LEADERBOARD: { name: "Bottom billboard", size: "970 × 250 desktop · 320 × 100 phone" },
  SIDEBAR_RECTANGLE: { name: "Sidebar rectangle", size: "300 × 250" },
  IN_FEED_NATIVE: { name: "In-feed native", size: "Fluid · matches a story card" },
};

const DEFAULT_DISABLED = ["/artists/"];

/** Creates the four placements if they are missing. Call from admin, not every public render. */
export const ensureAdSlots = cache(async () => {
  await prisma.adSlot.createMany({
    data: AD_PLACEMENTS.map((placement) => ({
      placement,
      enabled: true,
      fillMode: "DIRECT_ONLY",
      disabledOn: DEFAULT_DISABLED,
    })),
    skipDuplicates: true,
  });
});

export async function getAdminAdSlots(): Promise<AdSlotWithCreatives[]> {
  await ensureAdSlots();
  return prisma.adSlot.findMany({
    include: { creatives: { orderBy: { name: "asc" } } },
  });
}

function pickWeighted<T extends { weight: number }>(rows: T[]): T {
  const total = rows.reduce((n, r) => n + Math.max(1, r.weight), 0);
  let roll = Math.random() * total;
  for (const r of rows) {
    roll -= Math.max(1, r.weight);
    if (roll <= 0) return r;
  }
  return rows[0]!;
}

/** Public ads are off until you flip the switch on /admin/ads — creatives stay saved. */
export const adsArePublic = cache(async () => {
  const row = await prisma.siteSetting.findUnique({ where: { key: SETTING_KEYS.adsPublic } });
  return (row?.value as { visible?: boolean } | null)?.visible === true;
});

export const resolveSlot = cache(async (placement: AdPlacement, path: string) => {
  if (!(await adsArePublic())) return null;

  const slot = await prisma.adSlot.findUnique({
    where: { placement },
    include: {
      creatives: {
        where: {
          active: true,
          OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }],
        },
      },
    },
  });

  if (!slot || !slot.enabled) return null;
  if (slot.disabledOn.some((p) => path.startsWith(p))) return null;

  const sold = slot.creatives.filter((c) => !c.isHouse);
  const house = slot.creatives.filter((c) => c.isHouse);

  if (slot.fillMode !== "NETWORK_ONLY" && slot.fillMode !== "HOUSE_ONLY" && sold.length) {
    return { kind: "direct" as const, slot, creative: pickWeighted(sold) };
  }
  if (slot.fillMode === "DIRECT_THEN_NETWORK" || slot.fillMode === "NETWORK_ONLY") {
    if (slot.networkCode) return { kind: "network" as const, slot, creative: null };
  }
  if (house.length) return { kind: "house" as const, slot, creative: pickWeighted(house) };
  return null;
});

/**
 * Advertiser closeout. Never include house creatives — a brand report that
 * silently counts our own newsletter banner is the same failure as counting
 * an impression nobody scrolled to. Filter is `creative: { isHouse: false }`.
 * Totals here are already viewable-only (IntersectionObserver on the slot).
 */
export async function getSoldCreativeReport(creativeId: string) {
  const creative = await prisma.adCreative.findUnique({
    where: { id: creativeId },
    select: {
      id: true,
      name: true,
      advertiser: true,
      isHouse: true,
      startsAt: true,
      endsAt: true,
      impressions: true,
      clicks: true,
    },
  });
  if (!creative || creative.isHouse) return null;

  const days = await prisma.adStatDaily.findMany({
    where: { creativeId, creative: { isHouse: false } },
    orderBy: { day: "asc" },
  });
  const impressions = days.reduce((n, d) => n + d.impressions, 0);
  const clicks = days.reduce((n, d) => n + d.clicks, 0);
  return {
    ...creative,
    impressions,
    clicks,
    ctr: impressions ? clicks / impressions : 0,
    days,
  };
}
