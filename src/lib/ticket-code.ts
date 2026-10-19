const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.afrolitplaylist.com").replace(/\/$/, "");

/** Phone cameras only offer a link if the QR payload is a URL. */
export function ticketPublicUrl(code: string) {
  return `${SITE}/t/${encodeURIComponent(code)}`;
}

/** Accept a pasted ALP- code or a scanned https://…/t/ALP-… URL. */
export function parseTicketPayload(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    const m = u.pathname.match(/\/t\/([^/]+)/i);
    if (m?.[1]) return decodeURIComponent(m[1]).toUpperCase();
    const q = u.searchParams.get("code");
    if (q) return q.trim().toUpperCase();
  } catch {
    /* plain code */
  }
  return s.replace(/\s+/g, "").toUpperCase();
}
