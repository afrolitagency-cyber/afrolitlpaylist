import dynamic from "next/dynamic";
import type { ThemeComponents } from "./types";

export const THEME_KEYS = ["editorial", "centred", "musicblog", "darkroom", "street"] as const;
export type ThemeKey = (typeof THEME_KEYS)[number];
export const DEFAULT_THEME: ThemeKey = "editorial";

export const THEME_META: Record<ThemeKey, { name: string; description: string }> = {
  editorial: { name: "Editorial", description: "Centred masthead, magazine grid" },
  centred: { name: "Centred Masthead", description: "Black masthead, image band, live clock" },
  musicblog: { name: "Music Blog", description: "Feature strip with a tall lead card" },
  darkroom: { name: "Darkroom", description: "Full-bleed poster hero" },
  street: { name: "Street", description: "Dense grid, trending albums, countries strip" },
};

/**
 * Dynamic imports keep the four unused themes out of the bundle — the cost of
 * shipping five templates stays close to the cost of shipping one.
 */
const loaders: Record<ThemeKey, () => Promise<{ default: ThemeComponents }>> = {
  editorial: () => import("./editorial"),
  centred: () => import("./centred"),
  musicblog: () => import("./musicblog"),
  darkroom: () => import("./darkroom"),
  street: () => import("./street"),
};

export async function loadTheme(key: ThemeKey): Promise<ThemeComponents> {
  const safe = THEME_KEYS.includes(key) ? key : DEFAULT_THEME;
  const mod = await loaders[safe]();
  return mod.default;
}
