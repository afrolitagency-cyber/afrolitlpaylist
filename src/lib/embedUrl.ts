const SPOTIFY_KINDS = new Set(["playlist", "album", "track", "episode", "show", "artist"]);
const YOUTUBE_ID = /^[\w-]{6,}$/;

/** Turns a share link, embed address, or pasted iframe into a safe iframe URL. */
export function normalizeEmbedUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const fromIframe = trimmed.match(/\bsrc=["']([^"']+)["']/i)?.[1];
  const candidate = (fromIframe ?? trimmed).trim();

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;

  if (url.hostname === "open.spotify.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0]?.startsWith("intl-")) parts.shift();
    const embedded = parts[0] === "embed";
    const kind = embedded ? parts[1] : parts[0];
    const id = embedded ? parts[2] : parts[1];
    if (!kind || !id || !SPOTIFY_KINDS.has(kind) || !/^[\w]+$/.test(id)) return null;
    return `https://open.spotify.com/embed/${kind}/${id}`;
  }

  if (url.hostname === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    if (!id || !YOUTUBE_ID.test(id)) return null;
    return `https://www.youtube.com/embed/${id}`;
  }

  if (url.hostname === "www.youtube.com" || url.hostname === "youtube.com" || url.hostname === "www.youtube-nocookie.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const list = url.searchParams.get("list");
    if ((parts[0] === "embed" && parts[1] === "videoseries") || parts[0] === "playlist") {
      if (!list || !/^[\w-]+$/.test(list)) return null;
      return `https://www.youtube.com/embed/videoseries?list=${list}`;
    }
    const id = parts[0] === "embed" ? parts[1] : url.searchParams.get("v");
    if (!id || !YOUTUBE_ID.test(id)) return null;
    return `https://www.youtube.com/embed/${id}`;
  }

  if (url.hostname === "embed.music.apple.com" && url.pathname.length > 1) {
    return url.toString();
  }

  return null;
}
