export const PLATFORMS = [
  { key: "spotify", label: "Spotify", search: "https://open.spotify.com/search/" },
  { key: "apple", label: "Apple Music", search: "https://music.apple.com/search?term=" },
  { key: "audiomack", label: "Audiomack", search: "https://audiomack.com/search?q=" },
  { key: "boomplay", label: "Boomplay", search: "https://www.boomplay.com/search/default/" },
  { key: "youtube", label: "YouTube Music", search: "https://music.youtube.com/search?q=" },
] as const;

export type PlatformKey = (typeof PLATFORMS)[number]["key"];
export type AlbumLinks = Partial<Record<PlatformKey, string>>;

export function isPlatform(value: string): value is PlatformKey {
  return PLATFORMS.some((p) => p.key === value);
}

export function platformLabel(key: string) {
  return PLATFORMS.find((p) => p.key === key)?.label ?? key;
}

export function readLinks(value: unknown): AlbumLinks {
  if (!value || typeof value !== "object") return {};
  const out: AlbumLinks = {};
  for (const p of PLATFORMS) {
    const url = (value as Record<string, unknown>)[p.key];
    if (typeof url === "string" && /^https:\/\//i.test(url)) out[p.key] = url;
  }
  return out;
}

/** Linked apps when the editor set any, otherwise a search on every app. */
export function listenTargets(album: { title: string; artistName: string; links: AlbumLinks }) {
  const linked = PLATFORMS.filter((p) => album.links[p.key]);
  const list = linked.length ? linked : PLATFORMS;
  return list.map((p) => ({
    key: p.key,
    label: p.label,
    url: album.links[p.key] ?? p.search + encodeURIComponent(`${album.title} ${album.artistName}`),
  }));
}
