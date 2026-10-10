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
  embed: "site.embed",
  albumStyle: "site.albumStyle",
} as const;

export const ALBUM_STYLES = ["spotlight", "strip"] as const;
export type AlbumStyle = (typeof ALBUM_STYLES)[number];
export type AlbumStyles = Record<ThemeKey, AlbumStyle>;

const DEFAULT_ALBUM_STYLES: AlbumStyles = {
  editorial: "spotlight",
  centred: "spotlight",
  musicblog: "spotlight",
  darkroom: "spotlight",
  street: "strip",
};

/** Which Trending Albums layout each homepage template uses. */
export const getAlbumStyles = cache(async (): Promise<AlbumStyles> => {
  const row = await prisma.siteSetting.findUnique({ where: { key: SETTING_KEYS.albumStyle } });
  const saved = (row?.value ?? {}) as Record<string, unknown>;
  const out = { ...DEFAULT_ALBUM_STYLES };
  for (const key of THEME_KEYS) {
    const value = saved[key];
    if (ALBUM_STYLES.includes(value as AlbumStyle)) out[key] = value as AlbumStyle;
  }
  return out;
});

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

export type EmbedItem = { title: string; url: string };

function asEmbedItems(value: unknown): EmbedItem[] {
  if (Array.isArray(value)) return value.flatMap(asEmbedItems);
  if (!value || typeof value !== "object") return [];
  const record = value as { items?: unknown; title?: unknown; url?: unknown };
  if (Array.isArray(record.items)) return asEmbedItems(record.items);
  if (typeof record.url === "string" && record.url) {
    return [{ title: typeof record.title === "string" ? record.title : "", url: record.url }];
  }
  return [];
}

/** Sidebar players, in the order they were saved. An empty list hides the section. */
export const getEmbedSetting = cache(async (): Promise<EmbedItem[]> => {
  const row = await prisma.siteSetting.findUnique({ where: { key: SETTING_KEYS.embed } });
  return asEmbedItems(row?.value).slice(0, 12);
});
