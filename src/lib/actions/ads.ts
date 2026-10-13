"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AdFillMode, AdPlacement } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoleFresh } from "@/lib/rbac";
import { AD_PLACEMENTS } from "@/lib/ads";
import { SETTING_KEYS } from "@/lib/settings";
import { runAction, type ActionState } from "./_result";

const https = z
  .string()
  .url()
  .refine((u) => u.startsWith("https://"), "Use an https:// link");

/** Empty, "https://", or a host without a scheme → a real https URL or "". */
function asHttpsUrl(raw: unknown): string {
  let s = String(raw ?? "").trim();
  if (!s || s === "https://" || s === "http://") return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  return s;
}

function revalidateAds() {
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin/ads");
  revalidatePath("/", "layout");
}

export async function setAdsPublic(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh("ADMIN");
    const visible = formData.get("visible") === "on";
    await prisma.siteSetting.upsert({
      where: { key: SETTING_KEYS.adsPublic },
      create: { key: SETTING_KEYS.adsPublic, value: { visible } },
      update: { value: { visible } },
    });
    revalidateAds();
    return { ok: true, message: visible ? "Ads are showing on the site." : "Ads are hidden. Creatives are unchanged." };
  });
}

export async function saveAdSlot(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh("ADMIN");
    const placement = String(formData.get("placement") ?? "") as AdPlacement;
    if (!AD_PLACEMENTS.includes(placement)) return { ok: false, error: "Unknown placement." };

    const fillMode = String(formData.get("fillMode") ?? "DIRECT_ONLY") as AdFillMode;
    const disabledOn = String(formData.get("disabledOn") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    await prisma.adSlot.update({
      where: { placement },
      data: {
        enabled: formData.get("enabled") === "on",
        fillMode,
        networkCode: String(formData.get("networkCode") ?? "").trim() || null,
        disabledOn,
      },
    });

    revalidateAds();
    return { ok: true, message: "Slot saved." };
  });
}

const creativeInput = z.object({
  id: z.string().cuid().optional(),
  slotId: z.string().cuid(),
  name: z.string().min(1).max(120),
  advertiser: z.string().max(120).optional().nullable(),
  imageUrl: z.union([https, z.literal("")]).optional().nullable().transform((v) => v || null),
  imageUrlMobile: z.union([https, z.literal("")]).optional().nullable().transform((v) => v || null),
  altText: z.string().max(200).optional().nullable(),
  clickUrl: z.union([https, z.literal("")]).optional().nullable().transform((v) => v || null),
  headline: z.string().max(200).optional().nullable().transform((v) => v?.trim() || null),
  body: z.string().max(400).optional().nullable().transform((v) => v?.trim() || null),
  thumbUrl: z.union([https, z.literal("")]).optional().nullable().transform((v) => v || null),
  ctaLabel: z.string().max(40).optional().nullable().transform((v) => v?.trim() || null),
  trackerUrl: z.union([https, z.literal("")]).optional().nullable().transform((v) => v || null),
  weight: z.number().int().min(1).max(99).default(1),
  startsAt: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.date().nullable().optional()),
  endsAt: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.date().nullable().optional()),
  active: z.boolean().default(true),
  isHouse: z.boolean().default(false),
});

export async function saveAdCreative(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh("ADMIN");
    const data = creativeInput.parse({
      id: formData.get("id") || undefined,
      slotId: formData.get("slotId"),
      name: formData.get("name"),
      advertiser: formData.get("advertiser") || null,
      imageUrl: asHttpsUrl(formData.get("imageUrl")),
      imageUrlMobile: asHttpsUrl(formData.get("imageUrlMobile")),
      altText: formData.get("altText") || null,
      clickUrl: asHttpsUrl(formData.get("clickUrl")),
      headline: formData.get("headline") || null,
      body: formData.get("body") || null,
      thumbUrl: asHttpsUrl(formData.get("thumbUrl")),
      ctaLabel: formData.get("ctaLabel") || null,
      trackerUrl: asHttpsUrl(formData.get("trackerUrl")),
      weight: formData.get("weight") ? Number(formData.get("weight")) : 1,
      startsAt: formData.get("startsAt") || null,
      endsAt: formData.get("endsAt") || null,
      active: formData.get("active") === "on",
      isHouse: formData.get("isHouse") === "on",
    });

    const slot = await prisma.adSlot.findUnique({
      where: { id: data.slotId },
      select: { placement: true },
    });
    if (!slot) return { ok: false, error: "Unknown slot." };

    const isNative = slot.placement === "IN_FEED_NATIVE";
    if (!data.clickUrl) {
      return { ok: false, error: "Add a full click URL, e.g. https://example.com", fieldErrors: { clickUrl: ["Add a full https:// link."] } };
    }
    if (isNative && !data.headline) return { ok: false, error: "A native creative needs a headline." };
    if (!isNative && !data.imageUrl) return { ok: false, error: "A banner creative needs a desktop image." };

    const { id, ...rest } = data;
    if (id) await prisma.adCreative.update({ where: { id }, data: rest });
    else await prisma.adCreative.create({ data: rest });

    revalidateAds();
    return { ok: true, message: id ? "Creative saved." : "Creative added." };
  });
}

export async function deleteAdCreative(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh("ADMIN");
    const id = String(formData.get("id") ?? "");
    if (!id) return { ok: false, error: "Missing creative." };
    await prisma.adCreative.delete({ where: { id } });
    revalidateAds();
    return { ok: true, message: "Creative removed." };
  });
}
