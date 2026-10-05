import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { THEME_KEYS, type ThemeKey, DEFAULT_THEME } from "@/components/themes/registry";

export type SiteIdentity = {
  name: string;
  tagline: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  socials: Partial<Record<"instagram" | "x" | "youtube" | "tiktok", string>>;
};

export const SETTING_KEYS = {
  theme: "site.theme",
  identity: "site.identity",
  behaviour: "site.behaviour",
} as const;

const FALLBACK_IDENTITY: SiteIdentity = {
  name: "AfroLit Playlist",
  tagline: "Afro music blog site",
  socials: {},
};

/** Cached per request — many components ask for this on one render. */
export const getActiveTheme = cache(async (): Promise<ThemeKey> => {
  const row = await prisma.siteSetting.findUnique({ where: { key: SETTING_KEYS.theme } });
  const value = (row?.value as { key?: string } | null)?.key;
  return THEME_KEYS.includes(value as ThemeKey) ? (value as ThemeKey) : DEFAULT_THEME;
});

export const getIdentity = cache(async (): Promise<SiteIdentity> => {
  const row = await prisma.siteSetting.findUnique({ where: { key: SETTING_KEYS.identity } });
  return { ...FALLBACK_IDENTITY, ...((row?.value as Partial<SiteIdentity>) ?? {}) };
});
